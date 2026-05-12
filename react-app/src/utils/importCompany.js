import { migrateLegacyCompany } from './dataStructures'

// Fields with these names are stripped before normalization. Claude is asked
// to attach `_safeType` and `_notes` to SAFEs as metadata for the human user,
// and may emit a top-level `_warning` if the cap table looked off. We surface
// those as warnings but never persist them on the company.
const STRIP_KEYS = new Set(['_safeType', '_notes', '_warning'])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getNumber(value) {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function checkPercent(label, value, errors) {
  if (value === null || value === undefined || value === '') return
  const n = Number(value)
  if (!Number.isFinite(n)) {
    errors.push(`${label} is not a number (got ${JSON.stringify(value)})`)
    return
  }
  if (n < 0 || n > 100) {
    errors.push(`${label} = ${n} is outside 0–100`)
  }
}

function checkNonNegative(label, value, errors) {
  if (value === null || value === undefined || value === '') return
  const n = Number(value)
  if (!Number.isFinite(n)) {
    errors.push(`${label} is not a number (got ${JSON.stringify(value)})`)
    return
  }
  if (n < 0) {
    errors.push(`${label} = ${n} is negative`)
  }
}

// Hard validation — runs before normalization. Returns an array of error strings.
function hardValidate(raw) {
  const errors = []

  if (!isPlainObject(raw)) {
    errors.push('Top-level JSON must be an object')
    return errors
  }

  if (typeof raw.name === 'string') {
    if (raw.name.trim() === '') errors.push('"name" must not be empty')
  } else if (raw.name !== undefined) {
    errors.push('"name" must be a string')
  }

  checkNonNegative('postMoneyVal', raw.postMoneyVal ?? raw.postMoney, errors)
  checkNonNegative('roundSize', raw.roundSize ?? raw.round, errors)
  checkNonNegative('investorPortion', raw.investorPortion ?? raw.investor, errors)
  checkNonNegative('otherPortion', raw.otherPortion ?? raw.other, errors)
  checkPercent('currentEsopPercent', raw.currentEsopPercent, errors)
  checkPercent('grantedEsopPercent', raw.grantedEsopPercent, errors)
  checkPercent('targetEsopPercent', raw.targetEsopPercent, errors)

  if (raw.founders !== undefined) {
    if (!Array.isArray(raw.founders)) {
      errors.push('"founders" must be an array')
    } else {
      raw.founders.forEach((f, i) => {
        if (!isPlainObject(f)) {
          errors.push(`founders[${i}] must be an object`)
          return
        }
        checkPercent(`founders[${i}].ownershipPercent`, f.ownershipPercent, errors)
      })
    }
  }

  if (raw.priorInvestors !== undefined) {
    if (!Array.isArray(raw.priorInvestors)) {
      errors.push('"priorInvestors" must be an array')
    } else {
      raw.priorInvestors.forEach((p, i) => {
        if (!isPlainObject(p)) {
          errors.push(`priorInvestors[${i}] must be an object`)
          return
        }
        checkPercent(`priorInvestors[${i}].ownershipPercent`, p.ownershipPercent, errors)
        if (p.proRataOverride !== null) {
          checkNonNegative(`priorInvestors[${i}].proRataOverride`, p.proRataOverride, errors)
        }
      })
    }
  }

  if (raw.safes !== undefined) {
    if (!Array.isArray(raw.safes)) {
      errors.push('"safes" must be an array')
    } else {
      raw.safes.forEach((s, i) => {
        if (!isPlainObject(s)) {
          errors.push(`safes[${i}] must be an object`)
          return
        }
        checkNonNegative(`safes[${i}].amount`, s.amount, errors)
        checkNonNegative(`safes[${i}].cap`, s.cap, errors)
        checkPercent(`safes[${i}].discount`, s.discount, errors)
      })
    }
  }

  if (raw.warrants !== undefined) {
    if (!Array.isArray(raw.warrants)) {
      errors.push('"warrants" must be an array')
    } else {
      raw.warrants.forEach((w, i) => {
        if (!isPlainObject(w)) {
          errors.push(`warrants[${i}] must be an object`)
          return
        }
        checkNonNegative(`warrants[${i}].amount`, w.amount, errors)
        checkNonNegative(`warrants[${i}].valuation`, w.valuation, errors)
      })
    }
  }

  return errors
}

// Pull out non-schema metadata Claude may attach (notes, warnings, safe type),
// returning the cleaned object plus a list of human-readable warning strings.
function extractMetadata(raw) {
  const warnings = []

  if (typeof raw._warning === 'string' && raw._warning.trim()) {
    warnings.push(`Claude flagged: ${raw._warning.trim()}`)
  }

  const cleaned = { ...raw }
  for (const key of STRIP_KEYS) delete cleaned[key]

  if (Array.isArray(cleaned.safes)) {
    cleaned.safes = cleaned.safes.map((s, i) => {
      if (!isPlainObject(s)) return s
      const label = (s.investorName || `SAFE #${i + 1}`).trim() || `SAFE #${i + 1}`
      if (typeof s._notes === 'string' && s._notes.trim()) {
        warnings.push(`${label}: ${s._notes.trim()}`)
      }
      if (s._safeType === 'pre-money') {
        warnings.push(`${label}: pre-money SAFE — conversion math in this app assumes post-money SAFEs, so the dilution is approximate.`)
      }
      const stripped = { ...s }
      for (const key of STRIP_KEYS) delete stripped[key]
      return stripped
    })
  }

  return { cleaned, warnings }
}

// Soft warnings — surfaced in the modal but don't block import.
function softWarnings(company) {
  const warnings = []

  const founderTotal = (company.founders || []).reduce((s, f) => s + (Number(f.ownershipPercent) || 0), 0)
  const priorTotal = (company.priorInvestors || []).reduce((s, p) => s + (Number(p.ownershipPercent) || 0), 0)
  const total = founderTotal + priorTotal + (Number(company.currentEsopPercent) || 0)

  if (founderTotal + priorTotal > 100) {
    warnings.push(`Founders + prior investors = ${(founderTotal + priorTotal).toFixed(1)}% (over 100%). The scenario won't compute until you trim this in the Inputs panel.`)
  } else if (total > 0 && total < 80) {
    warnings.push(`Founders + priors + ESOP = ${total.toFixed(1)}% (well under 100%). Cap table may be incomplete.`)
  }

  ;(company.safes || []).forEach((s, i) => {
    const amt = Number(s.amount) || 0
    if (amt <= 0) {
      warnings.push(`SAFE #${i + 1} (${s.investorName || 'unnamed'}): amount is 0 — will be ignored.`)
    }
    const cap = Number(s.cap) || 0
    const disc = Number(s.discount) || 0
    if (s.proRata && cap === 0 && disc === 0) {
      warnings.push(`SAFE #${i + 1} (${s.investorName || 'unnamed'}): pro-rata SAFE with no cap and no discount — double-check the parse.`)
    }
  })

  return warnings
}

// Parses a JSON string and runs validation + normalization. Returns either
// `{ ok: true, company, warnings }` or `{ ok: false, errors }`.
export function parseImportJson(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, errors: ['No JSON provided'] }
  }

  let raw
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { ok: false, errors: [`Invalid JSON: ${e.message}`] }
  }

  const hardErrors = hardValidate(raw)
  if (hardErrors.length > 0) {
    return { ok: false, errors: hardErrors }
  }

  const { cleaned, warnings: metaWarnings } = extractMetadata(raw)

  // Run through the same migration path as localStorage loading. This handles
  // legacy field names (postMoney/round/investor/other/proRataAmount) and
  // applies all defaults via createDefaultCompany().
  const fallbackName = typeof cleaned.name === 'string' && cleaned.name.trim()
    ? cleaned.name.trim()
    : 'Imported Scenario'
  const company = migrateLegacyCompany(cleaned, fallbackName)

  // normalizeSafe in dataStructures.js preserves but doesn't generate `id`,
  // so an imported SAFE without an id would cause a React key collision.
  company.safes = (company.safes || []).map((s, i) => (
    s && s.id !== undefined ? s : { ...s, id: `imported-safe-${Date.now()}-${i}` }
  ))

  const warnings = [...metaWarnings, ...softWarnings(company)]
  return { ok: true, company, warnings }
}
