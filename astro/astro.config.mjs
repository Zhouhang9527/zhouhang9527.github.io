import { defineConfig } from 'astro/config';
import config from './config/site.json' with {type:'json'};
import {localTitleArt} from './tools/local-title-art.mjs';
import {localFont} from './tools/local-font.mjs';
import {localVNUI} from './tools/local-vn-ui.mjs';
import {localMascot} from './tools/local-mascot.mjs';
export default defineConfig({
 devToolbar:{enabled:!process.env.GINKA_MASCOT_MANIFEST&&!process.env.GINKA_TITLE_DATA&&!process.env.GINKA_VN_UI_DATA},
 vite:{plugins:[localTitleArt(),localFont(),localVNUI(),localMascot()]},
 site:config.url, output:'static', trailingSlash:'always',
 build:{format:'directory'}, markdown:{shikiConfig:{themes:{light:'github-light',dark:'github-dark-dimmed'},defaultColor:false},gfm:true}
});
