import type { CollectionEntry } from 'astro:content';
export type Post = CollectionEntry<'posts'>;
export type Taxonomy = 'tags' | 'categories';
export type SceneKind = 'home' | 'archive' | Taxonomy | 'links' | 'about' | 'post';
export interface CollectionProps {
  kind: 'home' | 'archive' | Taxonomy;
  title: string;
  posts: Post[];
  names?: string[];
  page?: number;
  totalPages?: number;
  base?: string;
}
export type RouteProps =
  | { kind: 'post'; post: Post }
  | { kind: 'about'; title: string }
  | { kind: 'links'; title: string }
  | CollectionProps;
export interface StaticRoute { params: { path: string }; props: RouteProps }
