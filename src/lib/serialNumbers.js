/**
 * assets.serial_numbers is a jsonb column defaulting to '[]' — an empty array,
 * which is truthy in JS. Code that does `asset.serial_numbers || asset.serial_number`
 * never falls through to the real value, then crashes calling .split() on an array.
 * This normalizes either shape (jsonb array, comma string, or singular serial_number)
 * into a single comma-separated string, or '' when there's nothing usable.
 */
export function getSerialNumbersString(asset) {
  if (!asset) return '';
  const plural = asset.serial_numbers;
  if (Array.isArray(plural)) {
    if (plural.length > 0) return plural.join(',');
  } else if (plural) {
    return String(plural);
  }
  return asset.serial_number || '';
}

/** Same as above, but returns a trimmed, non-empty array of individual serials. */
export function getSerialNumbersArray(asset) {
  const s = getSerialNumbersString(asset);
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
}
