import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadSite, loadRecipes, orderedRecipes } from '../src/lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = mkdtempSync(join(tmpdir(), 'jr-dist-'));

execFileSync(process.execPath, [join(ROOT, 'build.mjs')], {
  env: { ...process.env, DIST_DIR: DIST },
  stdio: 'pipe',
});

const site = loadSite();
const recipes = loadRecipes();
const ordered = orderedRecipes(site, recipes);
const read = (p) => readFileSync(join(DIST, p), 'utf8');

test('core pages exist', () => {
  for (const p of ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'thanksgiving/index.html', 'credits/index.html', 'favicon.svg']) {
    assert.ok(existsSync(join(DIST, p)), `missing ${p}`);
  }
});

test('every recipe has a directly-linkable page with anchors and metadata', () => {
  for (const r of ordered) {
    const path = `recipes/${r.slug}/index.html`;
    assert.ok(existsSync(join(DIST, path)), `missing ${path}`);
    const html = read(path);
    assert.ok(html.includes('<h1>'), `${r.slug}: no h1`);
    assert.ok(html.includes(`<link rel="canonical" href="${site.baseUrl}/recipes/${r.slug}/">`), `${r.slug}: bad canonical`);
    assert.ok(html.includes('id="ingredients"'), `${r.slug}: no #ingredients anchor`);
    assert.ok(html.includes('id="directions"'), `${r.slug}: no #directions anchor`);
    assert.ok(html.includes('id="step-1"'), `${r.slug}: no #step-1 anchor`);
    assert.ok(html.includes(`id="step-${r.steps.length}"`), `${r.slug}: missing last step anchor`);
    assert.ok(html.includes('application/ld+json'), `${r.slug}: no JSON-LD`);
    assert.ok(html.includes('property="og:image"'), `${r.slug}: no og:image`);
    assert.ok(html.includes('Photo:'), `${r.slug}: hero photo credit missing`);
  }
});

test('no template bugs leak into html', () => {
  const walk = (dir) =>
    readdirSync(join(DIST, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []
    );
  for (const file of walk('.')) {
    const html = read(file);
    assert.ok(!html.includes('undefined'), `${file}: contains "undefined"`);
    assert.ok(!html.includes('[object Object]'), `${file}: contains "[object Object]"`);
    assert.ok(!html.includes('NaN<'), `${file}: contains NaN`);
  }
});

test('every internal link and image resolves to a built file', () => {
  const walk = (dir) =>
    readdirSync(join(DIST, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []
    );
  for (const file of walk('.')) {
    const html = read(file);
    const refs = [...html.matchAll(/(?:href|src|srcset)="(\/[^"]*)"/g)].flatMap((m) =>
      m[1].split(',').map((part) => part.trim().split(' ')[0])
    );
    for (const ref of refs) {
      const clean = ref.split('#')[0];
      if (!clean || clean === '/') continue;
      const target = clean.endsWith('/') ? `${clean}index.html` : clean;
      assert.ok(existsSync(join(DIST, target.slice(1))), `${file}: broken internal ref ${ref}`);
    }
  }
});

test('step anchors referenced in-page all exist', () => {
  for (const r of ordered) {
    const html = read(`recipes/${r.slug}/index.html`);
    for (const m of html.matchAll(/href="#(step-\d+)"/g)) {
      assert.ok(html.includes(`id="${m[1]}"`), `${r.slug}: dangling anchor #${m[1]}`);
    }
  }
});

test('sitemap covers all pages', () => {
  const xml = read('sitemap.xml');
  assert.ok(xml.includes(`${site.baseUrl}/</loc>`));
  assert.ok(xml.includes(`${site.baseUrl}/thanksgiving/</loc>`));
  for (const r of ordered) {
    assert.ok(xml.includes(`${site.baseUrl}/recipes/${r.slug}/</loc>`), `sitemap missing ${r.slug}`);
  }
});

test('home page links every recipe and every lost recipe', () => {
  const html = read('index.html');
  for (const r of ordered) assert.ok(html.includes(`href="/recipes/${r.slug}/"`), `home missing ${r.slug}`);
  for (const section of site.sections) {
    for (const lost of section.lost || []) assert.ok(html.includes(lost.title.replace(/'/g, '&#39;').replace(/’/g, '’')), `home missing lost recipe ${lost.title}`);
    assert.ok(html.includes(`id="${section.id}"`), `home missing section anchor #${section.id}`);
  }
});

test('json-ld parses and is a valid Recipe object', () => {
  for (const r of ordered) {
    const html = read(`recipes/${r.slug}/index.html`);
    const m = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert.ok(m, `${r.slug}: JSON-LD block missing`);
    const ld = JSON.parse(m[1]);
    assert.equal(ld['@type'], 'Recipe');
    assert.equal(ld.recipeInstructions.length, r.steps.length);
    assert.ok(ld.recipeIngredient.length > 0);
  }
});
