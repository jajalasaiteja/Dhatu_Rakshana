/**
 * Centralized Indian Standard Time (IST) Date & Time Utilities for Dhatu Rakshana Web UI.
 * Standardizes all date and time display across dashboards, inspection histories,
 * inspection details, visitor logs, and reports to Indian Standard Time (Asia/Kolkata, UTC+05:30).
 */

export const TIMEZONE_IST = 'Asia/Kolkata';
export const IST_LABEL = 'IST';

/**
 * Safely parses any date representation (string, number, Date) without throwing exceptions.
 * Normalizes naive legacy UTC SQLite strings by appending 'Z' when no timezone offset is present.
 *
 * @param {Date|string|number|null|undefined} input
 * @returns {Date|null}
 */
export function parseDateSafe(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input !== 'string') return null;

  const str = input.trim();
  if (!str || ['null', 'undefined', 'n/a', 'none', 'invalid date'].includes(str.toLowerCase())) {
    return null;
  }

  // Normalization for legacy SQLite timestamp strings: e.g. "2026-10-02 22:56:04.451796"
  let normalized = str;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(' ', 'T');
  }
  // If the ISO string lacks timezone information (no Z and no +/-HH:mm), treat as UTC (legacy DB format)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
    normalized = normalized + 'Z';
  }

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a timestamp into full IST Date and Time.
 * Example output: "23 Oct 2026, 02:30:15 PM IST"
 *
 * @param {Date|string|number} input
 * @param {Object} options
 * @param {boolean} [options.includeSeconds=true]
 * @param {boolean} [options.includeSuffix=true]
 * @param {string} [options.fallback='N/A']
 * @returns {string}
 */
export function formatISTDateTime(input, { includeSeconds = true, includeSuffix = true, fallback = 'N/A' } = {}) {
  const d = parseDateSafe(input);
  if (!d) return fallback;

  try {
    const opts = {
      timeZone: TIMEZONE_IST,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    if (includeSeconds) {
      opts.second = '2-digit';
    }

    const formatter = new Intl.DateTimeFormat('en-IN', opts);
    let formatted = formatter.format(d);
    // Standardize AM/PM casing
    formatted = formatted.replace(/\b([ap]m)\b/i, (m) => m.toUpperCase());

    if (includeSuffix && !formatted.includes(IST_LABEL)) {
      return `${formatted} ${IST_LABEL}`;
    }
    return formatted;
  } catch {
    return fallback;
  }
}

/**
 * Format timestamp into IST Date only.
 * Example output: "23 Oct 2026"
 *
 * @param {Date|string|number} input
 * @param {Object} options
 * @param {string} [options.fallback='N/A']
 * @returns {string}
 */
export function formatISTDate(input, { fallback = 'N/A' } = {}) {
  const d = parseDateSafe(input);
  if (!d) return fallback;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE_IST,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return formatter.format(d);
  } catch {
    return fallback;
  }
}

/**
 * Format timestamp into IST Time only.
 * Example output: "02:30 PM IST" or "02:30:15 PM IST"
 *
 * @param {Date|string|number} input
 * @param {Object} options
 * @param {boolean} [options.includeSeconds=false]
 * @param {boolean} [options.includeSuffix=true]
 * @param {string} [options.fallback='N/A']
 * @returns {string}
 */
export function formatISTTime(input, { includeSeconds = false, includeSuffix = true, fallback = 'N/A' } = {}) {
  const d = parseDateSafe(input);
  if (!d) return fallback;

  try {
    const opts = {
      timeZone: TIMEZONE_IST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    if (includeSeconds) {
      opts.second = '2-digit';
    }

    const formatter = new Intl.DateTimeFormat('en-IN', opts);
    let formatted = formatter.format(d);
    formatted = formatted.replace(/\b([ap]m)\b/i, (m) => m.toUpperCase());

    if (includeSuffix && !formatted.includes(IST_LABEL)) {
      return `${formatted} ${IST_LABEL}`;
    }
    return formatted;
  } catch {
    return fallback;
  }
}

/**
 * Safely compare two dates in descending order (newest first).
 */
export function compareDatesDesc(a, b) {
  const da = parseDateSafe(a);
  const db = parseDateSafe(b);
  const ta = da ? da.getTime() : 0;
  const tb = db ? db.getTime() : 0;
  return tb - ta;
}

/**
 * Safely compare two dates in ascending order (oldest first).
 */
export function compareDatesAsc(a, b) {
  const da = parseDateSafe(a);
  const db = parseDateSafe(b);
  const ta = da ? da.getTime() : 0;
  const tb = db ? db.getTime() : 0;
  return ta - tb;
}
