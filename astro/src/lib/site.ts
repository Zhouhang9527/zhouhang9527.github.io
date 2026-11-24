import {getCollection} from 'astro:content';
import sceneMap from '../../../config/ginka-scene-map.json';
import legacy from '../../config/legacy-routes.json';
export const site='https://www.mm9527.top';
export const href=(route:string)=>'/'+route.split('/').map(encodeURIComponent).join('/');
export const tagSlug=(value:string)=>value.trim().toLowerCase().replace(/\s+/g,'-');
export const allPosts=async()=> (await getCollection('posts')).sort((a,b)=>(b.data.sticky||0)-(a.data.sticky||0)||b.data.date.localeCompare(a.data.date)||a.id.localeCompare(b.id));
export const taxonomy=(posts:any[],key:'tags'|'categories')=>Array.from(new Set(posts.flatMap(p=>p.data[key]))).sort((a,b)=>a.localeCompare(b));
export function scene(kind:string,slot:'sidebar'|'masthead'='sidebar'){
 const routes=sceneMap.routes as Record<string,any>;
 const slug=(routes[kind]||routes.post)[slot][1], width=slot==='sidebar'?640:kind==='about'?1280:960;
 return {day:'/images/ginka/scenes/'+slug+'-day-'+width+'.webp',night:'/images/ginka/scenes/'+slug+'-night-'+width+'.webp'};
}
export async function routes(){
 const posts=await allPosts();
 const map=new Map<string,any>();
 const add=(route:string,props:any)=>map.set(route.replace(/\/$/,''),props);
 posts.forEach(post=>add(post.data.route,{kind:'post',post}));
 const pageSize=10;
 const paginate=(base:string,list:any[],title:string,kind:string)=>{
  for(let page=1;page<=Math.max(1,Math.ceil(list.length/pageSize));page++){
   if(!base&&page===1)continue;
   add(base+(page===1?'':'page/'+page+'/'),{kind,title,posts:list.slice((page-1)*pageSize,page*pageSize),page,totalPages:Math.max(1,Math.ceil(list.length/pageSize)),base});
  }
 };
 paginate('',posts,'往期文章','home');
 paginate('archives/',posts,'文章归档','archive');
 for(const year of new Set(posts.map(p=>p.data.date.slice(0,4)))) {
  const group=posts.filter(p=>p.data.date.startsWith(year));
  paginate('archives/'+year+'/',group,year+' 年归档','archive');
  for(const month of new Set(group.map(p=>p.data.date.slice(5,7))))paginate('archives/'+year+'/'+month+'/',group.filter(p=>p.data.date.slice(5,7)===month),year+' / '+month,'archive');
 }
 for(const key of ['tags','categories'] as const){
  const names=taxonomy(posts,key);
  add(key+'/',{kind:key,title:key==='tags'?'标签与主题':'内容分类',names,posts});
  const groups=new Map<string,string[]>();
  for(const name of names){const slug=tagSlug(name);groups.set(slug,[...(groups.get(slug)||[]),name]);}
  for(const [slug,values] of groups)paginate(key+'/'+slug+'/',posts.filter(p=>p.data[key].some(v=>values.includes(v))),values[0],key);
 }
 for(const slug of ['about','links'])add(slug+'/',{kind:slug,title:slug==='about'?'关于':'友情链接'});
 // Refuse silent URL loss, including historic paginated taxonomies.
 for(const r of legacy)if(!map.has(r.replace(/\/$/,'')))throw Error('Missing legacy route '+r);
 return [...map].map(([path,props])=>({params:{path},props}));
}
