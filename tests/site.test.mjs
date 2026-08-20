import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

test('Japanese and English pages exist',()=>{for(const p of ['dist/ja/index.html','dist/en/index.html','dist/ja/outputs/index.html','dist/en/policy/index.html'])assert.ok(fs.existsSync(p),p)});

test('empty repository is clear and contains no persistent sample records',()=>{
  const html=fs.readFileSync('dist/ja/index.html','utf8');
  const records=fs.readdirSync('data/outputs').filter((name)=>name.endsWith('.json'));
  assert.deepEqual(records,[]);
  assert.match(html,/nana-r-logo\.png/);
  assert.match(html,/現在、公開中の研究成果はありません/);
});

test('promotional blocks and left-accent cards are absent',()=>{const html=fs.readFileSync('dist/ja/index.html','utf8');const css=fs.readFileSync('dist/assets/site.css','utf8');assert.doesNotMatch(html,/研究成果の公開|出版社版への導線|公開原稿へのアクセス/);assert.doesNotMatch(css,/border-left:4px/)});

test('license renders and an omitted abstract creates no empty section',()=>{
  const fixture='data/outputs/NRR-2099-999.json';
  const record={id:'NRR-2099-999',sample:true,title:'Clearly labelled temporary test record',authors:[{name:'Test Author'}],affiliations:['Test Affiliation'],journal:{name:'Test Journal',year:2099,volume:'',issue:'',pages:'',doi:'',url:''},repository_file:{type:'Author Accepted Manuscript',url:'',posted:'2099-01-01',license:{name:'Creative Commons Attribution 4.0 International',url:'https://creativecommons.org/licenses/by/4.0/'}},keywords:['test']};
  fs.writeFileSync(fixture,`${JSON.stringify(record)}\n`);
  try{
    execFileSync(process.execPath,['scripts/generate.mjs']);
    const html=fs.readFileSync('dist/en/outputs/nrr-2099-999/index.html','utf8');
    assert.match(html,/Creative Commons Attribution 4\.0 International/);
    assert.match(html,/creativecommons\.org\/licenses\/by\/4\.0/);
    assert.doesNotMatch(html,/<h2>Abstract<\/h2>/);
  }finally{
    fs.rmSync(fixture,{force:true});
    execFileSync(process.execPath,['scripts/generate.mjs']);
  }
});
