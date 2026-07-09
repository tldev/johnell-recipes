# Johnell Family Recipes

*Seasoned with a Mother’s Love at Christmas — December 25, 2007*

The family cookbook Mom made, as a website: **https://recipes.tomjohnell.com**

The original Word document lives untouched in [`original/`](original/). Every
recipe was transcribed faithfully — dedications, sign-offs, and all. Where the
original had gaps (the lost Shrimp Fondue page, the eggs Yaya never counted),
the site says so instead of papering over them.

## How it works

A zero-dependency Node static site generator. No npm installs, ever.

```
src/data/site.json        # site structure, sections, Thanksgiving menu
src/data/recipes/*.json   # one file per recipe (title, ingredients, steps, …)
src/data/photos.json      # photo manifest: file, alt text, author, license
src/templates.mjs         # HTML templates
src/client/               # styles.css + app.js (progressive enhancement)
static/img/               # free-use photographs (see /credits/ on the site)
build.mjs                 # renders everything to dist/
```

```bash
node build.mjs        # build to dist/
node --test           # data + build-output tests
npm run serve         # build and serve on http://localhost:8080
```

Every recipe page is directly linkable (`/recipes/moms-meatloaf/`), and so is
every step (`/recipes/moms-meatloaf/#step-3`). Pages work with JavaScript
disabled; with it you get ingredient check-off, step done-marking, and a
keep-the-screen-on toggle for cooking.

All photographs are free-use (public domain / Creative Commons) from Wikimedia
Commons, credited on [/credits/](https://recipes.tomjohnell.com/credits/) and
in `src/data/photos.json`.

## Adding or editing a recipe

1. Add/edit `src/data/recipes/<slug>.json` (copy an existing file for the shape).
2. List the slug in the right section of `src/data/site.json`.
3. Add a hero photo entry in `src/data/photos.json` + the image in `static/img/`.
4. `node --test` — the tests will tell you anything you forgot.

## Deployment

Pushes to `main` run CI (tests, then a multi-stage Docker build → static site
served by unprivileged nginx on `:8080`) and publish
`ghcr.io/tldev/johnell-recipes:latest`. The media-server’s watchtower picks up
new images within a minute; Traefik terminates TLS for
`recipes.tomjohnell.com`. Container config lives in the media-server repo under
`compose/johnell-recipes/`.

`docker compose up` here runs a local copy on http://localhost:8080.
