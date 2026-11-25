// Pure date operations shared by staging, content ordering and metadata.
// Never let the build machine's timezone interpret an unqualified wall time.
const SHANGHAI = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  timeZoneName: 'longOffset'
});
const DAY = 86_400_000;
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})(?:[Tt ](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(?:[ \t]*([Zz]|[+-]\d{2}:?\d{2}))?)?$/;

function partsAt(epoch) {
  const parts = Object.fromEntries(SHANGHAI.formatToParts(new Date(epoch)).map(p => [p.type, p.value]));
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : parts.timeZoneName.replace(/^GMT/, '');
  if (!/^[+-]\d{2}:\d{2}$/.test(offset)) throw new Error('Unsupported historical Asia/Shanghai offset');
  const minutes = (Number(offset.slice(1, 3)) * 60 + Number(offset.slice(4))) * (offset[0] === '-' ? -1 : 1);
  const wall = `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  return {wall, offset, minutes};
}

function formatShanghai(epoch) {
  if (!Number.isFinite(epoch)) throw new Error('Invalid post timestamp');
  const {wall, offset} = partsAt(epoch);
  const milliseconds = new Date(epoch).getUTCMilliseconds();
  return wall + (milliseconds ? '.' + String(milliseconds).padStart(3, '0') : '') + offset;
}

/** Normalize a source scalar (or an already-known Date instant) to Shanghai RFC 3339. */
export function normalizePostTimestamp(value) {
  if (value instanceof Date) return formatShanghai(value.getTime());
  if (typeof value !== 'string') throw new Error('Post timestamp must be a string or Date');
  const match = value.trim().match(TIMESTAMP);
  if (!match) throw new Error('Invalid post timestamp: ' + value);
  const [, day, hour = '00', minute = '00', second = '00', fraction = '', zone] = match;
  const wall = `${day}T${hour}:${minute}:${second}`;
  const nominal = Date.parse(wall + fraction + 'Z');
  // Date.parse rolls e.g. February 30 into March; do not silently change source dates.
  if (Number(day.slice(0, 4)) < 1 || !Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 19) !== wall) {
    throw new Error('Invalid calendar date/time: ' + value);
  }
  if (zone) {
    const offset = /^[Zz]$/.test(zone) ? 'Z' : zone.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
    if (offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59 || offset === '-00:00')) {
      throw new Error('Invalid or unknown timezone offset: ' + value);
    }
    return formatShanghai(Date.parse(wall + fraction + offset));
  }
  // Resolve the named timezone, including its historical DST transitions. Gaps
  // and overlaps are rejected instead of guessing; authors can supply an offset.
  const offsets = new Set([-DAY, 0, DAY].map(delta => partsAt(nominal + delta).minutes));
  const candidates = [...offsets].map(offset => nominal - offset * 60_000)
    .filter(epoch => partsAt(epoch).wall === wall);
  if (candidates.length !== 1) throw new Error('Ambiguous or nonexistent Asia/Shanghai wall time: ' + value);
  return formatShanghai(candidates[0]);
}

/** Newest publication first, comparing instants rather than offset spellings. */
export function comparePublicationDates(a, b) {
  return Date.parse(normalizePostTimestamp(b)) - Date.parse(normalizePostTimestamp(a));
}

/** Preserve sticky priority and the previous deterministic tie-break for equal instants. */
export function comparePosts(a, b) {
  return (b.data.sticky || 0) - (a.data.sticky || 0) ||
    comparePublicationDates(a.data.date, b.data.date) || a.id.localeCompare(b.id);
}

/** No source update time means publication fallback, not filesystem/build time. */
export function postTimestamps(post) {
  const published = normalizePostTimestamp(post.date);
  return {published, modified: post.updated == null ? published : normalizePostTimestamp(post.updated)};
}
