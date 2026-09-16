// ============================================================================
// Indian states + union territories — the ONE list checkout and the order API
// share. Wix requires the ISO 3166-2 subdivision CODE on an address, not free
// text, so the dropdown stores the code and the server re-normalises it.
//
// The list used to hold 22 entries, and it lived in two files. Shoppers in J&K,
// Ladakh, Chandigarh, Puducherry, the North-East (bar Assam) and the island UTs
// had no option to pick, so they could not place an order at all.
//
// CODES: the 22 that were already here are left EXACTLY as they were — real
// orders go through with them today (note IN-CT / IN-OR / IN-TG / IN-UT, which
// ISO later re-coded; don't "modernise" them without testing against Wix). The
// 14 additions use the current ISO codes and have NOT yet been confirmed by a
// real Wix order: Wix's totals estimate accepts any code, so it can't prove it.
// ============================================================================

export interface IndiaState {
  code: string;
  name: string;
}

// Alphabetical, states and UTs mixed — the order a shopper scans a dropdown in.
export const IN_STATES: readonly IndiaState[] = [
  { code: "IN-AN", name: "Andaman and Nicobar Islands" },
  { code: "IN-AP", name: "Andhra Pradesh" },
  { code: "IN-AR", name: "Arunachal Pradesh" },
  { code: "IN-AS", name: "Assam" },
  { code: "IN-BR", name: "Bihar" },
  { code: "IN-CH", name: "Chandigarh" },
  { code: "IN-CT", name: "Chhattisgarh" },
  { code: "IN-DH", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "IN-DL", name: "Delhi" },
  { code: "IN-GA", name: "Goa" },
  { code: "IN-GJ", name: "Gujarat" },
  { code: "IN-HR", name: "Haryana" },
  { code: "IN-HP", name: "Himachal Pradesh" },
  { code: "IN-JK", name: "Jammu and Kashmir" },
  { code: "IN-JH", name: "Jharkhand" },
  { code: "IN-KA", name: "Karnataka" },
  { code: "IN-KL", name: "Kerala" },
  { code: "IN-LA", name: "Ladakh" },
  { code: "IN-LD", name: "Lakshadweep" },
  { code: "IN-MP", name: "Madhya Pradesh" },
  { code: "IN-MH", name: "Maharashtra" },
  { code: "IN-MN", name: "Manipur" },
  { code: "IN-ML", name: "Meghalaya" },
  { code: "IN-MZ", name: "Mizoram" },
  { code: "IN-NL", name: "Nagaland" },
  { code: "IN-OR", name: "Odisha" },
  { code: "IN-PY", name: "Puducherry" },
  { code: "IN-PB", name: "Punjab" },
  { code: "IN-RJ", name: "Rajasthan" },
  { code: "IN-SK", name: "Sikkim" },
  { code: "IN-TN", name: "Tamil Nadu" },
  { code: "IN-TG", name: "Telangana" },
  { code: "IN-TR", name: "Tripura" },
  { code: "IN-UP", name: "Uttar Pradesh" },
  { code: "IN-UT", name: "Uttarakhand" },
  { code: "IN-WB", name: "West Bengal" },
];

const byName = new Map(IN_STATES.map((s) => [s.name.toLowerCase(), s.code]));
const byCode = new Map(IN_STATES.map((s) => [s.code, s.name]));

/** Display name for a code, or the input unchanged if it isn't one of ours. */
export const stateName = (code: string): string => byCode.get(code) || code;

/**
 * Coerce whatever arrived into a Wix subdivision code: an `IN-XX` code passes
 * through (upper-cased), a full state name is looked up, anything else is
 * returned trimmed so Wix can reject it with its own error.
 */
export const normalizeSubdivision = (state: string): string => {
  const trimmed = state.trim();
  if (/^IN-[A-Z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return byName.get(trimmed.toLowerCase()) || trimmed;
};

// India Post's spellings that differ from ours (pincode lookup, /api/pincode).
const POSTAL_ALIASES: Record<string, string> = {
  chattisgarh: "IN-CT",
  orissa: "IN-OR",
  pondicherry: "IN-PY",
  uttaranchal: "IN-UT",
  "dadra and nagar haveli": "IN-DH",
  "daman and diu": "IN-DH",
  "andaman and nicobar": "IN-AN",
  "jammu & kashmir": "IN-JK",
  "new delhi": "IN-DL",
};

/** Our code for a state name as India Post writes it, or "" if unknown. */
export const stateCodeFromName = (name: string): string => {
  const key = name.trim().toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ");
  return byName.get(key) || POSTAL_ALIASES[key] || POSTAL_ALIASES[name.trim().toLowerCase()] || "";
};
