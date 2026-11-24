import {defineCollection,z} from 'astro:content';
import {glob} from 'astro/loaders';
const posts=defineCollection({loader:glob({pattern:'*.md',base:'./.generated/posts',generateId:({entry})=>entry.replace(/\.md$/,'')}),schema:z.object({title:z.string(),date:z.string(),route:z.string(),description:z.string().optional(),tags:z.array(z.string()).default([]),categories:z.array(z.string()).default([]),comments:z.boolean().optional(),sticky:z.number().optional(),featured:z.boolean().optional()}).passthrough()});
const pages=defineCollection({loader:glob({pattern:'*.md',base:'./.generated/pages'}),schema:z.object({title:z.string()})});
export const collections={posts,pages};
