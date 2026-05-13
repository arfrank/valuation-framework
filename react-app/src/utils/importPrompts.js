// Prompt the user copies into Claude.ai (or another LLM) alongside an XLS
// cap table and any SAFE PDFs. Claude returns JSON matching the app's import
// schema, which the user then pastes into the in-app import modal.

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
    { "investorName": "Bridge Investor", "amount": 2.0, "conversionType": "cap-discount", "cap": 40, "discount": 20, "proRata": true, "_safeType": "post-money", "_notes": "optional caveat" },
    { "investorName": "Accelerator", "amount": 0.5, "conversionType": "mfn", "cap": 0, "discount": 0, "proRata": false, "_safeType": "mfn-only" },
    { "investorName": "Y Combinator ES24, LLC", "amount": 0.125, "conversionType": "fixed-percent", "fixedOwnershipPercent": 7, "proRata": true }
  ],
  "warrants": [
    { "name": "Silicon Valley Bank", "amount": 1.0, "valuation": 50 }
  ],
  "currentEsopPercent": 8,
  "grantedEsopPercent": 5,
  "esopTiming": "pre-close"
}`

export const IMPORT_PROMPT = `You are converting startup financing documents into a strict JSON format for a valuation modeling tool.

You may receive any combination of:
- An Excel/Google Sheets cap table export.
- One or more SAFE PDFs.
- Side letters or notes that mention pro-rata rights.

Read all attached files together and return one consolidated JSON object.

Output rules
- Return ONLY a single JSON object — no prose, no markdown fence, no comments.
- All dollar amounts in millions ($2,500,000 → 2.5).
- All percentages on a 0–100 scale (18% → 18, not 0.18).
- Omit any field you cannot determine. Do not invent values.
- If only SAFE PDFs are attached and no cap table is available, return a JSON object with just the "safes" array.

Schema
${SCHEMA_BLOCK}

Mapping guidance
- founders: individuals listed as founders / common stockholders. Roll up multiple share classes or grant tranches for the same person into a single entry (sum the percentages). Exclude granted options — those go into grantedEsopPercent.
- priorInvestors: every existing investor entity (Seed Fund, angel, strategic). Sum across share classes (Pref-A, Pref-A-1, etc.). Set hasProRataRights: true if the cap table indicates pro-rata rights OR if you see a side letter / "MFN+PR" / explicit pro-rata column.
- safes: any outstanding SAFEs (often on a separate tab or below the main table). cap in $M, discount 0–100. If both blank, set both to 0 (uncapped, no discount).
- For each standard cap/discount SAFE PDF, investorName is the "Investor" party, amount is the "Purchase Amount", cap is the "Valuation Cap", and discount is the economic discount. A SAFE saying "85% of price" means discount: 15.
- Set conversionType to "cap-discount" for normal cap/discount SAFEs, "fixed-percent" when the SAFE converts into a stated ownership percentage (for example, YC Percentage = 7%), "round-price" when it converts at the next round price with no cap/discount economics, or "mfn" for MFN-only SAFEs.
- For fixed-percent SAFEs, include fixedOwnershipPercent on a 0–100 scale. Example: YC Percentage of seven percent means fixedOwnershipPercent: 7.
- YC batch packages commonly contain two SAFEs: a $125,000 YC ES SAFE with YC Percentage 7% (conversionType "fixed-percent", fixedOwnershipPercent 7), and a $375,000 YC ESP SAFE with MFN terms (conversionType "mfn", cap 0, discount 0).
- Set proRata: true if the SAFE or side letter grants pro-rata / participation rights. Otherwise false.
- Add _safeType: "post-money", "pre-money", or "mfn-only" when the SAFE type is visible. Add _notes for unusual terms such as MFN clauses, side letter caveats, unusual conversion triggers, or unclear extraction.
- warrants: warrant coverage. valuation is the reference / strike valuation in $M.
- currentEsopPercent: total authorized option pool. grantedEsopPercent: portion already issued to employees. If only one number is given, assume it's currentEsopPercent and set grantedEsopPercent: 0.
- Leave postMoneyVal, roundSize, investorPortion, otherPortion, investorName, targetEsopPercent OUT of the JSON — these are the deal terms the user will model afterward, not artifacts of the existing cap.
- Trim whitespace from names. Keep canonical casing ("Sequoia Capital", not "sequoia").

Sanity checks before returning:
- Founders + priorInvestors + currentEsopPercent should sum to roughly 100 when a cap table is present.
- SAFEs from PDFs should not duplicate SAFEs already listed in the cap table; merge duplicates into one entry when they clearly refer to the same instrument.
- If something is wildly off, add a _warning string field explaining what's missing or ambiguous.

Now convert all attached files into one JSON object.`
