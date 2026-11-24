import { defineConfig } from 'astro/config';
import config from './config/site.json' with {type:'json'};
export default defineConfig({
 site:config.url, output:'static', trailingSlash:'always',
 build:{format:'directory'}, markdown:{shikiConfig:{themes:{light:'github-light',dark:'github-dark-dimmed'},defaultColor:false},gfm:true}
});
