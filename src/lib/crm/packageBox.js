// SINGLE SOURCE OF TRUTH for Ojara's default shipping box.
// Every place that creates a Velocity order reads size + weight from HERE.
//
// NOTE: the create-only order only PRE-FILLS these dimensions. The operator can
// still pick a different saved box in the Velocity panel when they compare rates
// and ship. So this is the sensible default, not a hard lock.

// The saved box presets from Ojara's Velocity account (cm). Kept here so switching
// the default is a one-line change. Owner will confirm which is the real one; until
// then ACTIVE_BOX points at the LARGER so Velocity never under-quotes freight.
export const BOX_PRESETS = {
  ojara:    { length: 18, breadth: 10,  height: 5 },    // "Ojara"     18 x 10 x 5    (larger)
  ojaraBox: { length: 14, breadth: 9.5, height: 5.5 },  // "OJARA BOX" 14 x 9.5 x 5.5
};

// Which preset is the live default. Change this key (or ask Claude) once the owner
// confirms the real box; final box is also selectable in Velocity at ship time.
const ACTIVE_BOX = BOX_PRESETS.ojara;

export const PACKAGE_BOX = {
  length: ACTIVE_BOX.length,   // cm
  breadth: ACTIVE_BOX.breadth, // cm
  height: ACTIVE_BOX.height,   // cm  (per unit — height scales linearly with quantity)
  weight: 0.35,                // kg  = packed weight of the FIRST unit (~350 g, per owner)
};

// Weight added for EACH ADDITIONAL unit beyond the first (kg).
// Gemstone bracelet/ring is light; padded a little for safety. Adjust if needed.
export const EXTRA_UNIT_WEIGHT_KG = 0.1;

/** Parcel weight (kg) for a unit count: first-unit weight + extra per extra unit. */
export function parcelWeightKg(units = 1) {
  const u = Math.max(1, Number(units) || 1);
  return Number((PACKAGE_BOX.weight + (u - 1) * EXTRA_UNIT_WEIGHT_KG).toFixed(3));
}

/** Parcel height (cm) for a unit count: base height × units (linear). */
export function parcelHeightCm(units = 1) {
  const u = Math.max(1, Number(units) || 1);
  return Number((PACKAGE_BOX.height * u).toFixed(2));
}
