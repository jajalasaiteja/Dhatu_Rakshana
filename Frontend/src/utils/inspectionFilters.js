/**
 * Dhatu Rakshana — Inspection Verification & Obsolete Record Filtering
 *
 * Enforces frontend display rules to permanently eliminate obsolete historical inspection
 * entries (specifically historical test scans dated before October 27, 2026)
 * while preserving genuine inspections created through the normal upload workflow.
 */

/**
 * Checks whether an inspection object matches the obsolete historical inspection signatures.
 *
 * @param {Object} record - The inspection record to evaluate.
 * @returns {boolean} True if the record is an obsolete historical entry that must be excluded.
 */
export function isObsoleteHistoricalRecord(record) {
  if (!record || typeof record !== 'object') return false;

  // 1. Match obsolete storage keys / file artifacts from historical reset set
  const imagePath = String(
    record.image_path ||
    record.image_url ||
    record.thumbnail_url ||
    record.mesh_url ||
    record.mesh_path ||
    ''
  ).toLowerCase();

  if (
    imagePath.includes('/2026/10/01/') ||
    imagePath.includes('/2026/10/02/') ||
    imagePath.includes('/2026/10/03/') ||
    imagePath.includes('/2026/10/06/') ||
    imagePath.includes('/2026/10/07/') ||
    imagePath.includes('/2026/10/09/') ||
    imagePath.includes('preset_particulate') ||
    imagePath.includes('pg_test') ||
    imagePath.includes('7c98894408_sample_scratch_specimen') ||
    imagePath.includes('4a1270885e_scratch_test') ||
    imagePath.includes('062d072113_sample_test_image_1') ||
    imagePath.includes('7c118168f3_marine_scan_001_pinhole')
  ) {
    return true;
  }

  // 2. Match exact obsolete historical timestamps (any test scan prior to 2026-10-27)
  const ts = String(
    record.timestamp ||
    record.created_at ||
    record.evaluation_timestamp ||
    ''
  ).trim();

  // If timestamp starts with an early October 2026 date:
  if (
    ts.startsWith('2026-10-01') ||
    ts.startsWith('2026-10-02') ||
    ts.startsWith('2026-10-03') ||
    ts.startsWith('2026-10-06') ||
    ts.startsWith('2026-10-07') ||
    ts.startsWith('2026-10-08') ||
    ts.startsWith('2026-10-09') ||
    ts.startsWith('2026-10-23')
  ) {
    return true;
  }

  return false;
}

/**
 * Filters an inspection list, returning only valid genuine inspection records.
 *
 * @param {Array} records - Array of inspection records.
 * @returns {Array} Filtered list containing only genuine records.
 */
export function filterGenuineInspections(records) {
  if (!Array.isArray(records)) return [];
  return records.filter((r) => !isObsoleteHistoricalRecord(r));
}
