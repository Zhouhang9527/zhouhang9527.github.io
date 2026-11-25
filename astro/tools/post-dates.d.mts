export function normalizePostTimestamp(value: string | Date): string;
export function comparePublicationDates(a: string, b: string): number;
export function comparePosts(
  a: {id: string; data: {date: string; sticky?: number}},
  b: {id: string; data: {date: string; sticky?: number}}
): number;
export function postTimestamps(post: {date: string; updated?: string}): {published: string; modified: string};
