import { defineConfig } from 'astro/config';
import config from './config/site.json' with {type:'json'};
import {localTitleArt} from './tools/local-title-art.mjs';
export default defineConfig({
 vite:{plugins:[localTitleArt()]},
 site:config.url, output:'static', trailingSlash:'always',
 build:{format:'directory'}, markdown:{shikiConfig:{themes:{light:'github-light',dark:'github-dark-dimmed'},defaultColor:false},gfm:true}
});
