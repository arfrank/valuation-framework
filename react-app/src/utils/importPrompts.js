// Prompts the user copies into Claude.ai (or another LLM) alongside an XLS
// cap table or SAFE PDF. Claude returns JSON matching the app's import schema,
// which the user then pastes into the in-app import modal.

const SCHEMA_BLOCK = `{
  "name": "Acme",
  "founders": [
    { "name": "CEO", "ownershipPercent": 28 },
    { "name": "CTO", "ownershipPercent": 22 }
  ],
  "priorInvestors": [
    { "name": "Seed Lead", "ownershipPercent": 18, "hasProRataRights": true },
    { "name": "Pre-seed Angel", "ownershipPercent": 4, "hasProRataRights": false }
  ],
  "safes": [
    { "investorName": "Bridge Investor", "amount": 2.0, "cap": 40, "discount": 20, "proRata": true },
    { "investorName": "Accelerator", "amount": 0.5, "cap": 25, "discount": 0, "proRata": false }
  ],
  "warrants": [
    { "name": "Silicon Valley Bank", "amount": 1.0, "valuation": 50 }
  ],
  "currentEsopPercent": 8,
  "grantedEsopPercent": 5,
  "esopTiming": "pre-close"
}`

export const XLS_IMPORT_PROMPT = `You are converting a startup cap table (from an Excel/Google Sheet, possibly messy) into a strict JSON format for a valuation modeling tool.

Output rules
- Return ONLY a single JSON object — no prose, no markdown fence, no comments.
- All dollar amounts in millions ($2,500,000 → 2.5).
- All percentages on a 0–100 scale (18% → 18, not 0.18).
- Omit any field you cannot determine. Do not invent values.

Schema
${SCHEMA_BLOCK}

Mapping guidance
- founders: individuals listed as founders / common stockholders. Roll up multiple share classes or grant tranches for the same person into a single entry (sum the percentages). Exclude granted options — those go into grantedEsopPercent.
- priorInvestors: every existing investor entity (Seed Fund, angel, strategic). Sum across share classes (Pref-A, Pref-A-1, etc.). Set hasProRataRights: true if the cap table indicates pro-rata rights OR if you see a side letter / "MFN+PR" / explicit pro-rata column.
- safes: any outstanding SAFEs (often on a separate tab or below the main table). cap in $M, discount 0–100. If both blank, set both to 0 (uncapped, no discount).
- warrants: warrant coverage. valuation is the reference / strike valuation in $M.
- currentEsopPercent: total authorized option pool. grantedEsopPercent: portion already issued to employees. If only one number is given, assume it's currentEsopPercent and set grantedEsopPercent: 0.
- Leave postMoneyVal, roundSize, investorPortion, otherPortion, investorName, targetEsopPercent OUT of the JSON — these are the deal terms the user will model afterward, not artifacts of the existing cap.
- Trim whitespace from names. Keep canonical casing ("Sequoia Capital", not "sequoia").

Sanity check before returning: founders + priorInvestors + currentEsopPercent should sum to roughly 100. If it's wildly off, add a _warning string field explaining what's missing or ambiguous.

Now convert the attached cap table.`

export const SAFE_PDF_IMPORT_PROMPT = `You are extracting SAFE (Simple Agreement for Future Equity) terms from one or more PDFs into a strict JSON format.

Output rules
- Return ONLY a single JSON object with a "safes" array — no prose, no markdown fence.
- Dollar amounts in millions ($2,500,000 → 2.5).
- Discount as a number 0–100 (a 20% discount → 20).

Schema
{
  "safes": [
    {
      "investorName": "string",
      "amount": 2.0,
      "cap": 40,
      "discount": 20,
      "proRata": true,
      "_safeType": "post-money | pre-money | mfn-only",
      "_notes": "optional human-readable caveat"
    }
  ]
}

Extraction guidance
- investorName: the "Investor" party named on the cover / signature page.
- amount: the "Purchase Amount" in $M.
- cap: the "Valuation Cap" in $M. If MFN-only (no cap), set cap: 0.
- discount: the "Discount Rate" — a SAFE saying "85% of price" means a 15% discount, so discount: 15. A "20% discount" means discount: 20. If no discount clause, discount: 0.
- proRata: true if the SAFE or an attached side letter grants pro-rata / participation rights. Otherwise false.
- _safeType: "post-money" (YC post-money SAFE, most common since 2018), "pre-money" (legacy YC SAFE), or "mfn-only" (no cap, MFN clause only). The app does not yet model the post-vs-pre conversion difference, so flag pre-money SAFEs in _notes so the user knows the conversion math is approximate.
- _notes: anything unusual — most-favored-nation clauses, side letter terms, "valid until [date]", non-standard conversion triggers, etc.

If multiple SAFE PDFs are attached, return one entry per SAFE. Now process the attached PDF(s).`
