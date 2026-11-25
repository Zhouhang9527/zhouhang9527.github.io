// Temporary fail-closed gate for the identified extracted scene derivatives.
// A tracked path is not proof of permission to redistribute it. Replace this
// targeted gate with an audited public-asset allowlist, not an override flag.
const pendingScenePrefix='source/images/ginka/scenes/';

export function assertPublicStagingApproved(tracked){
 if(!Array.isArray(tracked))throw new TypeError('Expected tracked public candidate paths');
 const blocked=tracked.filter(file=>typeof file==='string'&&file.replaceAll('\\','/').replace(/^\.\//,'').toLowerCase().startsWith(pendingScenePrefix));
 if(!blocked.length)return;
 const sample=blocked.slice(0,5).join('\n  ');
 const remainder=blocked.length>5?`\n  ... and ${blocked.length-5} more`:'';
 throw new Error(`Public asset staging blocked: ${blocked.length} tracked path(s) under ${pendingScenePrefix} have no recorded public-distribution approval. No staging writes were made; existing astro/public and astro/.generated were left unchanged. Do not upload an older dist. Review DECISIONS.md PUB-01 or provide approved fallback assets before retrying.\n  ${sample}${remainder}`);
}
