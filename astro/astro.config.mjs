import { defineConfig } from 'astro/config';
export default defineConfig({
 site:'https://www.mm9527.top', output:'static', trailingSlash:'always',
 build:{format:'directory'}, markdown:{shikiConfig:{themes:{light:'github-light',dark:'github-dark-dimmed'},defaultColor:false},gfm:true}
});
