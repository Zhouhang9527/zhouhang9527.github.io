import {normalizePostTimestamp} from './post-dates.mjs';

/** Recover source wall times before YAML's implicit timestamp-to-Date conversion. */
export function readPostDates(parsed, file = 'post') {
  function read(field, required) {
    const value = parsed.data[field];
    if (value == null) {
      if (required) throw new Error(`Missing original ${field}: ${file}`);
      return undefined;
    }
    let scalar = value;
    if (value instanceof Date) {
      // js-yaml interprets an unquoted, zone-less timestamp as UTC. The raw
      // frontmatter, not that Date, is authoritative for the original wall time.
      // Explicitly unsupported Date aliases/tags/flow mappings must not silently
      // acquire an invented +08:00 conversion; quote the timestamp in that case.
      const raw = parsed.matter?.match(new RegExp('^' + field + '[ \\t]*:[ \\t]*([^\\r\\n]*)', 'm'))?.[1];
      if (raw == null) throw new Error(`Unsupported original ${field} scalar in ${file}; use a quoted timestamp`);
      scalar = raw.replace(/[ \t]+#.*$/, '').trim();
    }
    try {
      return normalizePostTimestamp(scalar);
    } catch (error) {
      throw new Error(`Invalid original ${field} in ${file}: ${error.message}`, {cause: error});
    }
  }
  const date = read('date', true);
  const updated = read('updated', false);
  return {date, dateOnly: date.slice(0, 10), ...(updated === undefined ? {} : {updated})};
}

/** Preserve other frontmatter fields without leaking YAML-null optional dates. */
export function withPostDates(data, dates) {
  const merged = {...data, ...dates};
  // gray-matter's safeDump rejects undefined; absent optional values must be
  // omitted entirely, not just overwritten with undefined or YAML null.
  if (merged.updated == null) delete merged.updated;
  return merged;
}

export function legacyPostRoutes(routes) {
  return new Map(routes.filter(route => /^20\d\d\//.test(route))
    .map(route => [route.replace(/\/$/, '').split('/').at(-1), route]));
}

/** Frozen legacy paths win; only new posts use the Shanghai calendar day. */
export function postRoute(stem, dateOnly, routeByStem) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) throw new Error('Expected a date-only route key');
  return routeByStem.get(stem) ?? dateOnly.replaceAll('-', '/') + '/' + stem + '/';
}
