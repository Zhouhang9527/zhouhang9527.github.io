import test from 'node:test';
import assert from 'node:assert/strict';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkBreaks from 'remark-breaks';

const processor=unified().use(remarkParse).use(remarkBreaks);

test('legacy soft line breaks render as explicit Markdown breaks',async()=>{
 const tree=await processor.run(processor.parse('**题目名称**: [NSSCTF 2025 秋招赛] ez_tea\n**类型**: Reverse Engineering\n**难度**: 中等'));
 const paragraph=tree.children.find(node=>node.type==='paragraph');
 assert.ok(paragraph);
 assert.equal(paragraph.children.filter(node=>node.type==='break').length,2);
 assert.deepEqual(paragraph.children.filter(node=>node.type==='text').map(node=>node.value),[
  ': [NSSCTF 2025 秋招赛] ez_tea',
  ': Reverse Engineering',
  ': 中等'
 ]);
});

test('blank-line paragraph boundaries stay paragraphs and fenced code stays literal',async()=>{
 const tree=await processor.run(processor.parse('first\nsecond\n\n```text\ncode one\ncode two\n```'));
 assert.equal(tree.children.filter(node=>node.type==='paragraph').length,1);
 assert.equal(tree.children[0].children.filter(node=>node.type==='break').length,1);
 const code=tree.children.find(node=>node.type==='code');
 assert.equal(code.value,'code one\ncode two');
});
