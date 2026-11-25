/** Blog ENHANCEMENT only: no original map locations, coordinates or unlock rules. */
export interface MapTopicPost {
  data: {
    route: string;
    title: string;
    tags: readonly string[];
    categories: readonly string[];
  };
}

export interface MapTopic<T extends MapTopicPost> {
  id: string;
  title: string;
  tags: string[];
  posts: T[];
}

// Stable technical group IDs, independent of article order and reading progress.
// These are not new taxonomy terms: only tags actually present in posts are shown.
const groups = [
  {id: 'android', title: 'Android', tags: ['Android', 'Frida', '梆梆']},
  {id: 'windows', title: 'Windows', tags: ['Windows', 'WinDbg', '页表']},
  {id: 'linux', title: 'Linux', tags: ['Linux']},
  {id: 'unity', title: 'Unity / IL2CPP', tags: ['Unity', 'IL2CPP']},
  {id: 'python', title: 'Python 反编译', tags: ['PyInstaller', 'Python反编译', 'pycdc']},
  {id: 'crypto', title: '编码与加密', tags: ['加密算法', 'AES', 'RC4', 'XTEA', 'TEA', 'MD5', 'Base64', '异或解密']},
  {id: 'analysis', title: '调试与代码分析', tags: ['动态调试', '反调试', '反反调试', '花指令', 'IDA Pro', 'Patch']},
  {id: 'unpacking', title: '加壳与脱壳', tags: ['UPX', '脱壳', 'PyInstaller', '梆梆']},
] as const;

/** Pure projection: preserves incoming post order and original route/title values. */
export function buildMapTopics<T extends MapTopicPost>(posts: readonly T[]): {
  topics: MapTopic<T>[];
  categories: {name: string; count: number}[];
} {
  const seen = new Set<string>();
  const unique = posts.filter(post => {
    if (seen.has(post.data.route)) return false;
    seen.add(post.data.route);
    return true;
  });
  const availableTags = new Set(unique.flatMap(post => [...post.data.tags]));
  const topics = groups.flatMap(group => {
    const tags = group.tags.filter(tag => availableTags.has(tag));
    if (!tags.length) return [];
    const matching = unique.filter(post => post.data.tags.some(tag => tags.some(value => value === tag)));
    return [{id: group.id, title: group.title, tags, posts: matching}];
  });
  const counts = new Map<string, number>();
  for (const post of unique) {
    for (const name of new Set(post.data.categories)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const categories = [...counts].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, count]) => ({name, count}));
  return {topics, categories};
}
