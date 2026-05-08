// PH academic year: August through end of May. June/July fall back to the
// previous SY so nothing is left unlabeled.
//   Aug 2025 - Jul 2026 -> "2025-2026"
//   May 2026            -> "2025-2026"
//   Jun/Jul 2026        -> "2025-2026"
//   Aug 2026            -> "2026-2027"
export function getSchoolYear(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();
  const startYear = month >= 7 ? year : year - 1; // 7 = August
  return `${startYear}-${startYear + 1}`;
}

export function currentSchoolYear() {
  return getSchoolYear(new Date());
}

// Returns [startDate, endExclusiveDate] for a given "YYYY-YYYY" string.
// Range: Aug 1 of startYear (inclusive) -> Aug 1 of endYear (exclusive).
export function schoolYearRange(schoolYear) {
  const m = /^(\d{4})-(\d{4})$/.exec(String(schoolYear || ''));
  if (!m) return null;
  const start = new Date(Number(m[1]), 7, 1, 0, 0, 0, 0);
  const end = new Date(Number(m[2]), 7, 1, 0, 0, 0, 0);
  return [start, end];
}

export function isValidSchoolYear(schoolYear) {
  const m = /^(\d{4})-(\d{4})$/.exec(String(schoolYear || ''));
  if (!m) return false;
  return Number(m[2]) === Number(m[1]) + 1;
}
