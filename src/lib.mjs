// Shared data loading + helpers for the build script and tests.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(ROOT, 'data');

export function loadSite() {
  return JSON.parse(readFileSync(join(DATA_DIR, 'site.json'), 'utf8'));
}

export function loadPhotos() {
  return JSON.parse(readFileSync(join(DATA_DIR, 'photos.json'), 'utf8'));
}

export function loadRecipes() {
  const dir = join(DATA_DIR, 'recipes');
  const recipes = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const slug = file.replace(/\.json$/, '');
    recipes[slug] = { slug, ...JSON.parse(readFileSync(join(dir, file), 'utf8')) };
  }
  return recipes;
}

// Recipes in site-order (the order sections list them).
export function orderedRecipes(site, recipes) {
  const out = [];
  for (const section of site.sections) {
    for (const slug of section.recipes) {
      if (recipes[slug]) out.push(recipes[slug]);
    }
  }
  return out;
}

export function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Step photos are specific to each recipe: photos.json key "<slug>--step-<n>"
// (n is the 1-based step number). Returns an array parallel to recipe.steps
// holding the photo key for that step, or null.
export function stepPhotoKey(slug, n) {
  return `${slug}--step-${n}`;
}

export function stepPhotoKeys(recipe, photos) {
  return recipe.steps.map((_, i) => {
    const key = stepPhotoKey(recipe.slug, i + 1);
    return photos[key] ? key : null;
  });
}
