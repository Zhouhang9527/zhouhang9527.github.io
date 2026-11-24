import versions from '../../.generated/assets.json';
export function asset(path: keyof typeof versions): string {
  return '/' + path + '?v=' + versions[path];
}
