/**
 * Exit math: project an investor's current check and ownership forward through
 * N rounds of dilution to a final exit valuation, and compute MOIC.
 *
 * All dollar values are in millions ($M) to match the rest of the app.
 */

/**
 * Resolve per-round dilution decimals from a uniform default and optional overrides.
 * @param {number} numRounds - integer >= 0
 * @param {number} uniformDilutionPercent - e.g. 20 for 20%
 * @param {Array<number|null>} overridesPercent - per-round % overrides; null/undefined = use uniform
 * @returns {Array<number>} array of length numRounds, decimals in [0, 1]
 */
export function resolveDilutions(numRounds, uniformDilutionPercent, overridesPercent = []) {
  const n = Math.max(0, Math.floor(Number(numRounds) || 0))
  const uniform = clampPercent(uniformDilutionPercent)
  const result = []
  for (let i = 0; i < n; i++) {
    const raw = overridesPercent[i]
    const hasOverride = raw !== null && raw !== undefined && raw !== '' && !Number.isNaN(Number(raw))
    const pct = hasOverride ? clampPercent(raw) : uniform
    result.push(pct / 100)
  }
  return result
}

function clampPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/**
 * Compute exit economics for a given investor position.
 * @param {Object} args
 * @param {number} args.initialCheck - initial investment in $M
 * @param {number} args.currentOwnership - current ownership as a percentage (e.g. 21.15)
 * @param {Array<number>} args.dilutions - per-round dilutions as decimals (e.g. [0.2, 0.2, 0.2])
 * @param {number} args.exitValuation - exit valuation in $M
 * @returns {{finalOwnership:number, exitProceeds:number, moic:number, perRound:Array<{round:number, dilution:number, ownership:number}>}}
 */
export function calculateExitReturn({ initialCheck, currentOwnership, dilutions, exitValuation }) {
  const check = Number(initialCheck) || 0
  const startOwnershipPct = Number(currentOwnership) || 0
  const exitVal = Number(exitValuation) || 0
  const safeDilutions = Array.isArray(dilutions) ? dilutions : []

  let ownershipPct = startOwnershipPct
  const perRound = []
  safeDilutions.forEach((d, i) => {
    const dec = Math.max(0, Math.min(1, Number(d) || 0))
    ownershipPct = ownershipPct * (1 - dec)
    perRound.push({
      round: i + 1,
      dilution: dec,
      ownership: ownershipPct,
    })
  })

  const finalOwnership = ownershipPct
  const exitProceeds = (finalOwnership / 100) * exitVal
  const moic = check > 0 ? exitProceeds / check : 0

  return { finalOwnership, exitProceeds, moic, perRound }
}

/**
 * Compute exit economics for multiple exit valuations sharing the same dilution path.
 * @param {Object} args
 * @param {number} args.initialCheck - initial investment in $M
 * @param {number} args.currentOwnership - current ownership percentage
 * @param {Array<number>} args.dilutions - per-round dilutions as decimals
 * @param {Array<number>} args.exitValuations - exit valuations in $M
 * @returns {{finalOwnership:number, perRound:Array<{round:number, dilution:number, ownership:number}>, outcomes:Array<{exitValuation:number, exitProceeds:number, moic:number}>}}
 */
export function calculateExitReturnsForValues({ initialCheck, currentOwnership, dilutions, exitValuations }) {
  const check = Number(initialCheck) || 0
  const startOwnershipPct = Number(currentOwnership) || 0
  const safeDilutions = Array.isArray(dilutions) ? dilutions : []
  const values = Array.isArray(exitValuations) ? exitValuations : []

  let ownershipPct = startOwnershipPct
  const perRound = []
  safeDilutions.forEach((d, i) => {
    const dec = Math.max(0, Math.min(1, Number(d) || 0))
    ownershipPct = ownershipPct * (1 - dec)
    perRound.push({
      round: i + 1,
      dilution: dec,
      ownership: ownershipPct,
    })
  })

  const finalOwnership = ownershipPct
  const outcomes = values.map((v) => {
    const exitVal = Number(v) || 0
    const exitProceeds = (finalOwnership / 100) * exitVal
    const moic = check > 0 ? exitProceeds / check : 0
    return { exitValuation: exitVal, exitProceeds, moic }
  })

  return { finalOwnership, perRound, outcomes }
}
