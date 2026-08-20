import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

test('Japanese and English pages plus crawler files exist',()=>{for(const p of ['dist/ja/index.html','dist/en/index.html','dist/ja/outputs/index.html','dist/en/policy/index.html','dist/robots.txt','dist/sitemap.xml'])assert.ok(fs.existsSync(p),p);assert.match(fs.readFileSync('dist/robots.txt','utf8'),/Sitemap: https:\/\/nana-r-research\.github\.io\/sitemap\.xml/)});

test('social cards are configured for the root and content pages',()=>{
  assert.ok(fs.statSync('dist/assets/social-card.png').size>0);
  for(const file of ['dist/index.html','dist/ja/index.html','dist/en/outputs/nrr-2026-003/index.html']){
    const html=fs.readFileSync(file,'utf8');
    for(const tag of ['og:title','og:description','og:url','og:image','og:image:width','og:image:height']) assert.match(html,new RegExp(`property="${tag}"`));
    assert.match(html,/name="twitter:card" content="summary_large_image"/);
    assert.match(html,/name="twitter:image" content="https:\/\/nana-r-research\.github\.io\/assets\/social-card\.png"/);
  }
});

test('repository contains no persistent sample records',()=>{
  const html=fs.readFileSync('dist/ja/index.html','utf8');
  const listingHtml=fs.readFileSync('dist/ja/outputs/index.html','utf8');
  const records=fs.readdirSync('data/outputs').filter((name)=>name.endsWith('.json'));
  const data=records.map((name)=>JSON.parse(fs.readFileSync(`data/outputs/${name}`,'utf8')));
  assert.ok(data.every((record)=>record.sample!==true));
  assert.match(html,/nana-r-logo\.png/);
  if(records.length===0) assert.match(html,/現在、公開中の研究成果はありません/);
  else for(const record of data) assert.match(listingHtml,new RegExp(record.id));
});

test('promotional blocks and left-accent cards are absent',()=>{const html=fs.readFileSync('dist/ja/index.html','utf8');const css=fs.readFileSync('dist/assets/site.css','utf8');assert.doesNotMatch(html,/研究成果の公開|出版社版への導線|公開原稿へのアクセス/);assert.doesNotMatch(css,/border-left:4px/)});

test('Scholar metadata, link-only records, and omitted abstracts render correctly',()=>{
  const fixture='data/outputs/NRR-2099-999.json';
  const record={id:'NRR-2099-999',sample:true,title:'Clearly labelled temporary test record',authors:[{name:'Test Author'}],affiliations:['Test Affiliation'],journal:{name:'Test Journal',year:2099,volume:'12',issue:'3',pages:'45–51',doi:'10.1234/example',url:'https://doi.org/10.1234/example'},repository_file:{type:'External Link Only',url:'',posted:'2099-01-01',license:{name:'Creative Commons Attribution 4.0 International',url:'https://creativecommons.org/licenses/by/4.0/'}},keywords:['test']};
  fs.writeFileSync(fixture,`${JSON.stringify(record)}\n`);
  try{
    execFileSync(process.execPath,['scripts/generate.mjs']);
    const html=fs.readFileSync('dist/en/outputs/nrr-2099-999/index.html','utf8');
    assert.match(html,/Creative Commons Attribution 4\.0 International/);
    assert.match(html,/creativecommons\.org\/licenses\/by\/4\.0/);
    assert.match(html,/External link only/);
    for(const tag of ['citation_title','citation_author','citation_publication_date','citation_journal_title','citation_volume','citation_issue','citation_firstpage','citation_lastpage','citation_doi']) assert.match(html,new RegExp(`name="${tag}"`));
    assert.doesNotMatch(html,/citation_pdf_url/);
    assert.doesNotMatch(html,/<h2>Abstract<\/h2>/);
  }finally{
    fs.rmSync(fixture,{force:true});
    execFileSync(process.execPath,['scripts/generate.mjs']);
  }
});
