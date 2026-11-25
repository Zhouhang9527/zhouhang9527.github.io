import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readPrivateFile,isPrivateRequest,byteRange,servePrivateBytes} from './private-http.mjs';
const request=(headers={},method='GET',remoteAddress='127.0.0.1')=>({method,headers:{host:'127.0.0.1:4321',...headers},socket:{remoteAddress}});
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}});
test('reject remote, nonlocal host, rebinding, cross-origin and non-read methods',()=>{
 assert.equal(isPrivateRequest(request()),true);
 assert.equal(isPrivateRequest(request({host:'[::1]:4321'},'HEAD','::1')),true);
 assert.equal(isPrivateRequest(request({host:'localhost:4321',origin:'http://localhost:4321','sec-fetch-site':'same-origin'})),true);
 for(const headers of [{host:'evil.test'},{host:'127.0.0.1:65536'},{host:undefined},{origin:'https://evil.test'},{origin:'http://127.0.0.1:9999'},{origin:'null'},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':'same-site'}])assert.equal(isPrivateRequest(request(headers)),false);
 assert.equal(isPrivateRequest(request({},'POST')),false);assert.equal(isPrivateRequest(request({},'GET','192.168.1.2')),false);
});
test('range handling is bounded; HEAD and If-Range never return partial data',()=>{
 const bytes=Buffer.from('0123456789');
 for(const [range,expected] of [['bytes=2-4','234'],['bytes=8-','89'],['bytes=-3','789'],['bytes=8-100','89']]){
  const res=response();servePrivateBytes(request({range}),res,bytes,'image/png');assert.equal(res.statusCode,206);assert.equal(res.body.toString(),expected);assert.equal(res.headers['Content-Length'],expected.length);
 }
 for(const range of ['bytes=10-','bytes=-0','bytes=4-2','bytes=0-1,3-4','invalid','bytes=999999999999999999999-']){const res=response();servePrivateBytes(request({range}),res,bytes,'image/png');assert.equal(res.statusCode,416);assert.equal(res.headers['Content-Range'],'bytes */10');}
 const head=response();servePrivateBytes(request({range:'bytes=0-1'},'HEAD'),head,bytes,'image/png');assert.equal(head.statusCode,200);assert.equal(head.body,undefined);assert.equal(head.headers['Content-Length'],10);
 const conditional=response();servePrivateBytes(request({range:'bytes=0-1','if-range':'unknown'}),conditional,bytes,'image/png');assert.equal(conditional.body.toString(),'0123456789');assert.equal(conditional.headers['Cache-Control'],'no-store');assert.equal(conditional.headers['Cross-Origin-Resource-Policy'],'same-origin');
 assert.deepEqual(byteRange('bytes=-100',10),[0,9]);
});
test('private files stay inside the real root, including symlink resolution',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-private-')),root=path.join(parent,'data');fs.mkdirSync(root);
 try{fs.writeFileSync(path.join(root,'asset.png'),'ok');fs.writeFileSync(path.join(parent,'outside.png'),'secret');
  assert.equal(readPrivateFile(root,'asset.png').toString(),'ok');
  assert.throws(()=>readPrivateFile(root,'../outside.png'));assert.throws(()=>readPrivateFile(root,path.join(parent,'outside.png')));assert.throws(()=>readPrivateFile(root,'asset.png',1));
  try{fs.symlinkSync(path.join(parent,'outside.png'),path.join(root,'link.png'));}catch(error){if(error.code==='EPERM')return;throw error;}
  assert.throws(()=>readPrivateFile(root,'link.png'),/symlink outside root/);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
