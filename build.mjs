#!/usr/bin/env node
// Static site build: src/data + src/templates → dist/
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSite, loadRecipes, loadPhotos, orderedRecipes } from './src/lib.mjs';
import { homePage, recipePage, menuPage, notFoundPage } from './src/templates.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = process.env.DIST_DIR || join(ROOT, 'dist');

const site = loadSite();
const recipes = loadRecipes();
const photos = loadPhotos();
const ordered = orderedRecipes(site, recipes);

// -- sanity checks (tests go deeper; these keep a broken build from shipping) --
for (const r of Object.values(recipes)) {
  if (!photos[r.image]) throw new Error(`recipe ${r.slug}: no photo entry for image key "${r.image}"`);
  if (r.card && !photos[r.card]) throw new Error(`recipe ${r.slug}: no photo entry for card key "${r.card}"`);
}
for (const section of site.sections) {
  for (const slug of section.recipes) {
    if (!recipes[slug]) throw new Error(`site.json section ${section.id} lists unknown recipe "${slug}"`);
  }
}
if (!photos.turkey) throw new Error('photos.json must include a "turkey" entry (Thanksgiving menu page)');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });

// -- static assets --
cpSync(join(ROOT, 'static'), DIST, { recursive: true });
for (const key of Object.keys(photos)) {
  const p = photos[key];
  for (const f of [p.file, p.thumb].filter(Boolean)) {
    if (!existsSync(join(DIST, 'img', f))) throw new Error(`photos.json references missing image static/img/${f}`);
  }
}

// -- hashed css/js --
const assets = {};
for (const [name, out, keyName] of [
  ['client/styles.css', 'css', 'css'],
  ['client/app.js', 'js', 'js'],
]) {
  const body = readFileSync(join(ROOT, 'src', name));
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 10);
  const base = name.split('/').pop().replace(/\.(css|js)$/, '');
  const file = `${base}.${hash}.${out}`;
  writeFileSync(join(DIST, 'assets', file), body);
  assets[keyName] = file;
}

// -- pages --
const write = (path, html) => {
  const file = path.endsWith('.html') ? join(DIST, path) : join(DIST, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

write('', homePage({ site, recipes, photos, assets }));
write('thanksgiving', menuPage({ site, recipes, photos, assets }));
write('404.html', notFoundPage({ site, assets }));
for (const recipe of ordered) {
  write(join('recipes', recipe.slug), recipePage({ site, recipes, ordered, recipe, photos, assets }));
}

// -- sitemap + robots --
const urls = ['/', '/thanksgiving/', ...ordered.map((r) => `/recipes/${r.slug}/`)];
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${site.baseUrl}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`
);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);

console.log(`built ${urls.length} pages → ${DIST}`);
