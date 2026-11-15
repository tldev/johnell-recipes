// HTML templates. Every dynamic value goes through esc(); photo metadata
// (file, size, alt text, step captions) comes from src/data/photos.json.
import { esc, stepPhotoKeys } from './lib.mjs';

function img(photo, { cls = '', sizes = '100vw', loading = 'lazy', useThumb = false } = {}) {
  const src = useThumb && photo.thumb ? `/img/${photo.thumb}` : `/img/${photo.file}`;
  const srcset = photo.thumb
    ? `srcset="/img/${esc(photo.thumb)} 640w, /img/${esc(photo.file)} ${photo.width}w" sizes="${esc(sizes)}"`
    : '';
  const dims = useThumb && photo.thumbWidth
    ? `width="${photo.thumbWidth}" height="${photo.thumbHeight}"`
    : `width="${photo.width}" height="${photo.height}"`;
  return `<img src="${esc(src)}" ${srcset} ${dims} alt="${esc(photo.alt)}" loading="${loading}" decoding="async" class="${esc(cls)}">`;
}

export function page({ site, assets, title, description, path, bodyClass, content, ogImage, jsonLd }) {
  const canonical = `${site.baseUrl}${path}`;
  const fullTitle = title ? `${title} · ${site.title}` : `${site.title} — ${site.tagline}`;
  const ld = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/${assets.css}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(title || site.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="article">
${ogImage ? `<meta property="og:image" content="${esc(site.baseUrl)}/img/${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
${ld}
</head>
<body class="${esc(bodyClass)}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <nav aria-label="Site">
    <a class="brand" href="/">Johnell Family Recipes</a>
    <span class="nav-links">
      <a href="/#appetizers">Appetizers</a>
      <a href="/#mains">Mains</a>
      <a href="/thanksgiving/">Thanksgiving</a>
    </span>
  </nav>
</header>
<main id="main">
${content}
</main>
<footer class="site-foot">
  <p class="colophon">${esc(site.colophon)}</p>
</footer>
<script src="/assets/${assets.js}" defer></script>
</body>
</html>
`;
}

export function homePage({ site, recipes, photos, assets }) {
  const sections = site.sections
    .map((section) => {
      const cards = section.recipes
        .map((slug) => {
          const r = recipes[slug];
          const photo = photos[r.image];
          return `<a class="card" href="/recipes/${esc(r.slug)}/" data-name="${esc(`${r.title} ${r.subtitle || ''} ${r.tagline}`.toLowerCase())}">
  <span class="card-photo">${img(photo, { useThumb: true, sizes: '(min-width: 700px) 320px, 100vw' })}</span>
  <span class="card-body">
    <span class="card-title">${esc(r.title)}</span>
    ${r.subtitle ? `<span class="card-subtitle">${esc(r.subtitle)}</span>` : ''}
    <span class="card-tagline">${esc(r.tagline)}</span>
    ${r.attribution ? `<span class="card-attr">From ${esc(r.attribution)}</span>` : ''}
  </span>
</a>`;
        })
        .join('\n');
      const lost = (section.lost || [])
        .map(
          (l) => `<div class="card card-lost" data-name="${esc(l.title.toLowerCase())}">
  <span class="card-body">
    <span class="card-title">${esc(l.title)}</span>
    <span class="card-tagline">${esc(l.note)}</span>
  </span>
</div>`
        )
        .join('\n');
      const menuLink = section.menuPage
        ? `<p class="section-extra"><a href="/thanksgiving/">The Thanksgiving menu, as Mom printed it</a></p>`
        : '';
      return `<section class="recipe-section" id="${esc(section.id)}" aria-label="${esc(section.title)}">
  <header class="section-head">
    <h2>${esc(section.title)}</h2>
    <p class="section-blurb">${esc(section.blurb)}</p>
    ${menuLink}
  </header>
  <div class="cards">
${cards}
${lost}
  </div>
</section>`;
    })
    .join('\n');

  const content = `<header class="home-head">
  <h1>${esc(site.title)}</h1>
  <p class="home-book">${esc(site.tagline)}<br>${esc(site.originalDate)}</p>
  <p class="home-desc">${esc(site.description)}</p>
  <p class="filter-wrap"><label class="visually-hidden" for="filter">Find a recipe</label><input id="filter" type="search" placeholder="Find a recipe" autocomplete="off"></p>
</header>
${sections}`;

  return page({
    site,
    assets,
    title: '',
    description: site.description,
    path: '/',
    bodyClass: 'page-home',
    content,
    ogImage: photos[recipes[site.sections[0].recipes[0]].image].file,
  });
}

export function recipePage({ site, recipes, ordered, recipe, photos, assets }) {
  const photo = photos[recipe.image];
  const card = recipe.card ? photos[recipe.card] : null;
  const section = site.sections.find((s) => s.id === recipe.section);
  const idx = ordered.findIndex((r) => r.slug === recipe.slug);
  const prev = ordered[(idx - 1 + ordered.length) % ordered.length];
  const next = ordered[(idx + 1) % ordered.length];

  const ingredients = recipe.ingredients
    .map((group) => {
      const heading = group.heading ? `<h3 class="ing-group">${esc(group.heading)}</h3>` : '';
      const items = group.items
        .map((item, i) => `<li class="ing" data-ing="${i}"><label><input type="checkbox"><span>${esc(item)}</span></label></li>`)
        .join('\n');
      return `${heading}\n<ul class="ing-list">\n${items}\n</ul>`;
    })
    .join('\n');

  const stepPhotos = stepPhotoKeys(recipe, photos);
  let stepNo = 0;
  const steps = recipe.steps
    .map((step, i) => {
      stepNo += 1;
      const id = `step-${stepNo}`;
      const heading = step.heading ? `<h3 class="step-group">${esc(step.heading)}</h3>` : '';
      const key = stepPhotos[i];
      const figure = key
        ? `<figure class="step-photo">
  ${img(photos[key], { sizes: '(min-width: 900px) 640px, 100vw' })}
  ${photos[key].caption ? `<figcaption>${esc(photos[key].caption)}</figcaption>` : ''}
</figure>`
        : '';
      return `${heading}
<li class="step" id="${id}">
  <div class="step-body">
    <p>${esc(step.text)}</p>
    <a class="step-anchor" href="#${id}" title="Link to this step" aria-label="Link to step ${stepNo}">#</a>
  </div>
  ${figure}
</li>`;
    })
    .join('\n');

  const metaRow = [
    recipe.attribution ? `<span class="attr">From ${esc(recipe.attribution)}</span>` : '',
    recipe.yield ? `<span class="yield">${esc(recipe.yield)}</span>` : '',
  ]
    .filter(Boolean)
    .join('<span class="dot">·</span>');

  const notes = (recipe.notes || []).map((n) => `<p class="recipe-note">${esc(n)}</p>`).join('\n');

  const content = `<article class="recipe" data-slug="${esc(recipe.slug)}">
<div class="recipe-hero">
  ${img(photo, { cls: 'recipe-hero-img', loading: 'eager', sizes: '(min-width: 1100px) 1040px, 100vw' })}
</div>
<header class="recipe-head">
  <p class="kicker"><a href="/#${esc(section.id)}">${esc(section.title)}</a></p>
  <h1>${esc(recipe.title)}</h1>
  ${recipe.subtitle ? `<p class="recipe-subtitle">${esc(recipe.subtitle)}</p>` : ''}
  ${metaRow ? `<p class="recipe-meta">${metaRow}</p>` : ''}
  ${recipe.dedication ? `<p class="dedication">${esc(recipe.dedication)}</p>` : ''}
  ${recipe.intro ? `<p class="recipe-intro">${esc(recipe.intro)}</p>` : ''}
</header>
<div class="recipe-grid">
  <aside class="pane-ings" aria-labelledby="ingredients">
    <h2 id="ingredients">Ingredients</h2>
    ${ingredients}
    <button class="reset-ings" hidden type="button">Clear checked</button>
  </aside>
  <div class="pane-steps">
    <div class="steps-toolbar">
      <h2 id="directions">Directions</h2>
      <button id="wake" type="button" hidden aria-pressed="false" title="Keep the screen awake while you cook">Keep screen on</button>
    </div>
    <ol class="steps">
${steps}
    </ol>
    ${notes}
    ${recipe.signoff ? `<p class="signoff">${esc(recipe.signoff)}</p>` : ''}
    ${card ? `<figure class="recipe-card">
      <a href="/img/${esc(card.file)}">${img(card, { useThumb: false, sizes: '(min-width: 900px) 640px, 100vw' })}</a>
      <figcaption>${esc(card.caption || 'The original recipe card.')}</figcaption>
    </figure>` : ''}
    ${recipe.editorsNote ? `<aside class="editors-note"><h3>Transcription note</h3><p>${esc(recipe.editorsNote)}</p></aside>` : ''}
  </div>
</div>
<nav class="recipe-nav" aria-label="More recipes">
  <a class="nav-prev" href="/recipes/${esc(prev.slug)}/"><span>Previous</span>${esc(prev.title)}</a>
  <a class="nav-next" href="/recipes/${esc(next.slug)}/"><span>Next</span>${esc(next.title)}</a>
</nav>
</article>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.tagline,
    image: `${site.baseUrl}/img/${photo.file}`,
    url: `${site.baseUrl}/recipes/${recipe.slug}/`,
    author: { '@type': 'Person', name: recipe.attribution || 'The Johnell Family' },
    recipeCategory: section.title,
    recipeIngredient: recipe.ingredients.flatMap((g) => g.items),
    recipeInstructions: recipe.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: s.text,
      url: `${site.baseUrl}/recipes/${recipe.slug}/#step-${i + 1}`,
    })),
  };
  if (recipe.yield) jsonLd.recipeYield = recipe.yield;

  return page({
    site,
    assets,
    title: recipe.title,
    description: recipe.tagline,
    path: `/recipes/${recipe.slug}/`,
    bodyClass: 'page-recipe',
    content,
    ogImage: photo.file,
    jsonLd,
  });
}

export function menuPage({ site, recipes, photos, assets }) {
  const hero = photos.turkey;
  const courses = site.menu.courses
    .map((course) => {
      const items = course.items
        .map((item) => {
          const name = item.slug && recipes[item.slug]
            ? `<a href="/recipes/${esc(item.slug)}/">${esc(item.name)}</a>`
            : esc(item.name);
          return `<li>${name}</li>`;
        })
        .join('\n');
      return `<section class="course">
  <h2>${esc(course.title)}</h2>
  <ul class="course-items">
${items}
  </ul>
</section>`;
    })
    .join('\n');

  const content = `<div class="recipe-hero menu-hero">
  ${img(hero, { cls: 'recipe-hero-img', loading: 'eager', sizes: '(min-width: 1100px) 1040px, 100vw' })}
</div>
<article class="menu-card">
  <header class="menu-head">
    <h1>Thanksgiving Dinner<br>at The Johnell’s</h1>
    <p class="menu-note">${esc(site.menu.note)}</p>
  </header>
${courses}
  <p class="menu-foot">Dishes with a recipe in the book are linked. The rest are in <a href="/#thanksgiving">the Thanksgiving section</a> or you already know them.</p>
</article>`;

  return page({
    site,
    assets,
    title: 'Thanksgiving Menu',
    description: 'Thanksgiving dinner at the Johnells’: the menu from the 2007 family cookbook.',
    path: '/thanksgiving/',
    bodyClass: 'page-menu',
    content,
    ogImage: hero.file,
  });
}

export function notFoundPage({ site, assets }) {
  const content = `<article class="notfound">
  <h1>Page not found</h1>
  <p>There’s nothing at this address. <a href="/">Back to all recipes</a>.</p>
</article>`;
  return page({
    site,
    assets,
    title: 'Not found',
    description: 'Page not found.',
    path: '/404.html',
    bodyClass: 'page-404',
    content,
  });
}
