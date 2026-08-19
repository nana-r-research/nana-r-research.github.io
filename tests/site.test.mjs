import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('Japanese and English pages exist',()=>{for(const p of ['dist/ja/index.html','dist/en/index.html','dist/ja/outputs/index.html','dist/en/policy/index.html'])assert.ok(fs.existsSync(p),p)});
test('logo and labelled sample are rendered',()=>{const html=fs.readFileSync('dist/ja/index.html','utf8');assert.match(html,/nana-r-logo\.png/);assert.match(html,/実在する論文ではありません/)});
