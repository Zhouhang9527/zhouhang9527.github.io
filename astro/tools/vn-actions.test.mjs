import test from 'node:test';
import assert from 'node:assert/strict';
import {readerActions,isReaderAction,resolveOriginalAction} from '../src/domain/vn-actions.ts';
test('exact SystemAction whitelist; never executes arbitrary expressions',()=>{
 for(const [key,expression] of Object.entries(readerActions)){assert.equal(isReaderAction(key),true);assert.equal(resolveOriginalAction(expression),key);}
 for(const expression of ['SystemAction.save();alert(1)','SystemAction.save(1)','global.SystemAction.save()','constructor','__proto__',null])assert.equal(resolveOriginalAction(expression),null);
 assert.equal(isReaderAction('constructor'),false);assert.equal(isReaderAction('unknown'),false);
});
