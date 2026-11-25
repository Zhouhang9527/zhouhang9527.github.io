import { getCollection } from 'astro:content';
import legacy from '../../config/legacy-routes.json';
import mainline from '../../config/vn-mainline.json';
import config from '../../config/site.json';
import {comparePosts} from '../../tools/post-dates.mjs';
import type { Post, Taxonomy, CollectionProps, RouteProps, StaticRoute } from './types';

export const site = config.url;
export { config };
export const href = (route: string): string => '/' + route.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
/** The published v1 mainline stays stable when the journal grows. */
export function mainlinePaths(posts:readonly Post[]):string[]{
 const available=new Set(posts.map(p=>p.data.route));
 if(mainline.version!==1||!mainline.routes.length||new Set(mainline.routes).size!==mainline.routes.length)throw Error('Invalid VN mainline manifest');
 for(const route of mainline.routes)if(!available.has(route))throw Error('VN mainline route missing: '+route);
 return mainline.routes.map(href);
}
export const tagSlug = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '-');
export async function allPosts(): Promise<Post[]> {
  return (await getCollection('posts')).sort(comparePosts);
}
export function taxonomy(posts: Post[], key: Taxonomy): string[] {
  return Array.from(new Set(posts.flatMap(post => post.data[key]))).sort((a,b) => a.localeCompare(b));
}
export async function routes(): Promise<StaticRoute[]> {
  const posts = await allPosts();
  const map = new Map<string, RouteProps>();
  function add(route: string, props: RouteProps) {
    const key = route.replace(/\/$/, '');
    if (map.has(key)) throw new Error('Duplicate generated route: ' + route);
    map.set(key, props);
  }
  posts.forEach(post => add(post.data.route, {kind:'post', post}));
  function paginate(base: string, list: Post[], title: string, kind: CollectionProps['kind']) {
    const size = config.pageSize;
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    for (let page = 1; page <= totalPages; page++) {
      if (!base && page === 1) continue;
      add(base + (page === 1 ? '' : 'page/' + page + '/'), {
        kind, title, posts: list.slice((page - 1) * size, page * size), page, totalPages, base
      });
    }
  }
  paginate('', posts, '往期文章', 'home');
  paginate('archives/', posts, '文章归档', 'archive');
  for (const year of new Set(posts.map(p => p.data.date.slice(0,4)))) {
    const group = posts.filter(p => p.data.date.startsWith(year));
    paginate('archives/' + year + '/', group, year + ' 年归档', 'archive');
    for (const month of new Set(group.map(p => p.data.date.slice(5,7)))) {
      paginate('archives/' + year + '/' + month + '/', group.filter(p => p.data.date.slice(5,7) === month), year + ' / ' + month, 'archive');
    }
  }
  for (const key of ['tags','categories'] as const) {
    const names = taxonomy(posts,key);
    add(key + '/', {kind:key,title:key === 'tags' ? '标签与主题' : '内容分类',names,posts});
    const groups = new Map<string,string[]>();
    for (const name of names) {
      const slug = tagSlug(name);
      groups.set(slug,[...(groups.get(slug) || []),name]);
    }
    for (const [slug,values] of groups) {
      paginate(key + '/' + slug + '/',posts.filter(p => p.data[key].some(v => values.includes(v))),values[0],key);
    }
  }
  add('about/',{kind:'about',title:'关于'});
  add('links/',{kind:'links',title:'友情链接'});
  for (const route of legacy) {
    if (!map.has(route.replace(/\/$/,''))) throw new Error('Missing legacy route ' + route);
  }
  return Array.from(map, ([path,props]) => ({params:{path},props}));
}
