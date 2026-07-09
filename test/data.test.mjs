import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSite, loadRecipes, loadPhotos, orderedRecipes, stepPhotoKeys } from '../src/lib.mjs';

const site = loadSite();
const recipes = loadRecipes();
const photos = loadPhotos();

const SECTION_IDS = site.sections.map((s) => s.id);

test('site.json sections are well-formed', () => {
  assert.ok(site.sections.length >= 3);
  for (const section of site.sections) {
    assert.ok(section.id && section.title && section.blurb, `section ${section.id} incomplete`);
    assert.ok(section.recipes.length > 0, `section ${section.id} has no recipes`);
  }
});

test('every recipe listed in site.json exists, exactly once, and vice versa', () => {
  const listed = site.sections.flatMap((s) => s.recipes);
  assert.equal(new Set(listed).size, listed.length, 'duplicate slug in site.json');
  for (const slug of listed) assert.ok(recipes[slug], `site.json lists missing recipe ${slug}`);
  for (const slug of Object.keys(recipes)) {
    assert.ok(listed.includes(slug), `recipe file ${slug}.json not listed in site.json`);
  }
});

test('recipes have required fields and valid references', () => {
  for (const r of Object.values(recipes)) {
    assert.ok(r.title, `${r.slug}: missing title`);
    assert.ok(r.tagline, `${r.slug}: missing tagline`);
    assert.ok(SECTION_IDS.includes(r.section), `${r.slug}: bad section ${r.section}`);
    assert.equal(r.section, site.sections.find((s) => s.recipes.includes(r.slug))?.id, `${r.slug}: section mismatch with site.json`);
    assert.ok(photos[r.image], `${r.slug}: image key "${r.image}" missing from photos.json`);
    assert.ok(r.ingredients?.length > 0, `${r.slug}: no ingredients`);
    for (const group of r.ingredients) {
      assert.ok(Array.isArray(group.items) && group.items.length > 0, `${r.slug}: empty ingredient group`);
      for (const item of group.items) assert.ok(item.trim().length > 2, `${r.slug}: blank ingredient`);
    }
    assert.ok(r.steps?.length >= 2, `${r.slug}: fewer than 2 steps`);
    for (const step of r.steps) assert.ok(step.text?.trim().length > 10, `${r.slug}: blank/short step`);
  }
});

test('no extraction artifacts or template junk in recipe text', () => {
  const bad = /HYPERLINK|undefined|\[object|�/;
  for (const r of Object.values(recipes)) {
    const all = JSON.stringify(r);
    assert.ok(!bad.test(all), `${r.slug}: contains extraction/template artifact`);
  }
});

test('photos.json entries are complete and free-use', () => {
  const allowed = /public domain|cc0|cc[- ]by/i;
  for (const [key, p] of Object.entries(photos)) {
    for (const field of ['file', 'alt', 'title', 'pageUrl', 'artist', 'license', 'width', 'height']) {
      assert.ok(p[field], `photo ${key}: missing ${field}`);
    }
    assert.match(p.license, allowed, `photo ${key}: license "${p.license}" is not free-use`);
    assert.ok(!/NC|ND/.test(p.license), `photo ${key}: non-commercial/no-derivs license`);
  }
});

test('menu links point at real recipes', () => {
  for (const course of site.menu.courses) {
    for (const item of course.items) {
      if (item.slug) assert.ok(recipes[item.slug], `menu item ${item.name}: unknown slug ${item.slug}`);
    }
  }
});

test('step photo matching stays within bounds and only uses real photos', () => {
  for (const r of Object.values(recipes)) {
    const keys = stepPhotoKeys(r, photos);
    assert.equal(keys.length, r.steps.length);
    const used = keys.filter(Boolean);
    assert.ok(used.length <= 3, `${r.slug}: too many step photos`);
    assert.equal(new Set(used).size, used.length, `${r.slug}: repeated step photo`);
    for (const k of used) assert.ok(photos[k], `${r.slug}: step photo ${k} missing`);
  }
});

test('most recipes get at least one step photo', () => {
  const withPhotos = Object.values(recipes).filter((r) => stepPhotoKeys(r, photos).some(Boolean));
  assert.ok(
    withPhotos.length >= Object.keys(recipes).length * 0.75,
    `only ${withPhotos.length}/${Object.keys(recipes).length} recipes have step photos`
  );
});

test('ordering helper covers every recipe once', () => {
  const ordered = orderedRecipes(site, recipes);
  assert.equal(ordered.length, Object.keys(recipes).length);
  assert.equal(new Set(ordered.map((r) => r.slug)).size, ordered.length);
});
