import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./private-preview.mjs',import.meta.url));

test('private preview rejects invalid ports and arbitrary host overrides before reading asset inputs',()=>{
 for(const port of ['0','65536','-1','abc','43.5']){
  const result=spawnSync(process.execPath,[script,'missing-private-input','--port='+port],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/port must be 1\.\.65535/);assert.doesNotMatch(result.stderr,/Missing private preview asset/);
 }
 const exposed=spawnSync(process.execPath,[script,'missing-private-input','--host','0.0.0.0'],{encoding:'utf8'});
 assert.notEqual(exposed.status,0);assert.match(exposed.stderr,/Unknown option/);
 const extra=spawnSync(process.execPath,[script,'first-input','second-input'],{encoding:'utf8'});
 assert.notEqual(extra.status,0);assert.match(extra.stderr,/Usage:/);
});
