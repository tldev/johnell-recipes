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

// Which process photo (if any) illustrates a step. Rules are ordered most
// specific → most generic; a rule matches when every keyword group matches
// (a group matches when any of its alternatives appears in the step text).
const STEP_PHOTO_RULES = [
  ['fillo-fold', [['fillo', 'phyllo']]],
  ['pressure-pot', [['pressure cooker']]],
  ['grill', [['grill']]],
  ['whip-cream', [['whip cream', 'whipped cream', 'whip the cream', 'whip cream until', 'whipping cream', 'cream until stiff']]],
  ['boil-pasta', [['ziti', 'spaghetti', 'noodle', 'macaroni'], ['boil', 'salted boiling']]],
  ['fry', [['fry until', 'frying', 'fry ', 'skillet']]],
  ['brown-meat', [['add meat and brown', 'add the chopped sirloin and brown', 'meat and brown', 'brown the stew meat', 'browning ground']]],
  ['saute-onions', [['sauté onion', 'sauté the onion', 'sauté onions', 'onion and garlic in olive oil', 'onion and scallion until limp']]],
  ['simmer-sauce', [['simmer'], ['sauce', 'tomato']]],
  ['lemon', [['lemon'], ['squeeze', 'juice of']]],
  ['prep-chop', [['chop', 'dice', 'slice the potatoes', 'cut each stalk']]],
  ['oven', [['bake', 'oven', 'broil']]],
];

const MAX_STEP_PHOTOS = 3;

// Returns an array parallel to recipe.steps: process-photo key or null.
// Each process photo appears at most once per recipe, at its first match,
// capped at MAX_STEP_PHOTOS per recipe. Only keys present in `photos` are used.
export function stepPhotoKeys(recipe, photos) {
  const used = new Set([recipe.image]);
  let placed = 0;
  return recipe.steps.map((step) => {
    if (placed >= MAX_STEP_PHOTOS) return null;
    const text = step.text.toLowerCase();
    for (const [key, groups] of STEP_PHOTO_RULES) {
      if (used.has(key) || !photos[key]) continue;
      const matches = groups.every((alts) => alts.some((a) => text.includes(a.toLowerCase())));
      if (matches) {
        used.add(key);
        placed += 1;
        return key;
      }
    }
    return null;
  });
}

export const PROCESS_CAPTIONS = {
  'prep-chop': 'Good knife work first — everything else follows.',
  'saute-onions': 'Onions in the pan until limp, never browned.',
  'brown-meat': 'Brown the meat well — that’s the flavor.',
  'simmer-sauce': 'Low and slow. The sauce knows when it’s ready.',
  'boil-pasta': 'Salt the water. Don’t forget — salt the water.',
  'fillo-fold': 'Butter every layer, fold it like a flag.',
  'grill': 'Over the fire — sauce, turn, and sauce again.',
  'oven': 'Into the oven until golden and bubbling.',
  'whip-cream': 'Whip until stiff — but not too dry.',
  'fry': 'Hot oil, gentle hands.',
  'pressure-pot': 'The pot Yaya trusted — listen for the wobble.',
  'lemon': 'When in doubt, more lemon.',
};
