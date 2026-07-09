// Progressive enhancement only — the site is fully usable without this file.
(() => {
  'use strict';

  const store = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
    },
    set(key, value) {
      try {
        if (value.length) localStorage.setItem(key, JSON.stringify(value));
        else localStorage.removeItem(key);
      } catch { /* private mode — checking still works, it just won't persist */ }
    },
  };

  // ---- home: recipe filter ----
  const filter = document.getElementById('filter');
  if (filter) {
    const cards = [...document.querySelectorAll('.card[data-name]')];
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      for (const card of cards) card.hidden = q !== '' && !card.dataset.name.includes(q);
      for (const section of document.querySelectorAll('.recipe-section')) {
        section.hidden = q !== '' && ![...section.querySelectorAll('.card')].some((c) => !c.hidden);
      }
    });
  }

  // ---- recipe page ----
  const article = document.querySelector('article.recipe');
  if (!article) return;
  const slug = article.dataset.slug;

  // Ingredient check-off, persisted per recipe.
  const ingKey = `jr:${slug}:ings`;
  const boxes = [...article.querySelectorAll('.ing input')];
  const resetBtn = article.querySelector('.reset-ings');
  const syncReset = () => {
    if (resetBtn) resetBtn.hidden = !boxes.some((b) => b.checked);
  };
  const checked = new Set(store.get(ingKey));
  boxes.forEach((box, i) => {
    box.checked = checked.has(i);
    box.addEventListener('change', () => {
      const now = boxes.flatMap((b, j) => (b.checked ? [j] : []));
      store.set(ingKey, now);
      syncReset();
    });
  });
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      boxes.forEach((b) => { b.checked = false; });
      store.set(ingKey, []);
      syncReset();
    });
  }
  syncReset();

  // Step done-marking: tap the number to check off a step.
  const stepKey = `jr:${slug}:steps`;
  const steps = [...article.querySelectorAll('.steps > .step')];
  const doneSteps = new Set(store.get(stepKey));
  steps.forEach((step, i) => {
    if (doneSteps.has(i)) step.classList.add('done');
    step.querySelector('.step-body').addEventListener('click', (e) => {
      // Only the number medallion toggles (the ::before sits on .step-body's left edge).
      if (e.target.closest('a')) return;
      if (e.offsetX > 40 && e.target !== step) return;
      step.classList.toggle('done');
      const now = steps.flatMap((s, j) => (s.classList.contains('done') ? [j] : []));
      store.set(stepKey, now);
    });
  });

  // Copy step links.
  article.querySelectorAll('.step-anchor').forEach((a) => {
    a.addEventListener('click', () => {
      const url = new URL(a.getAttribute('href'), location.href).href;
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    });
  });

  // Cook mode: keep the screen awake while the recipe is open.
  const wakeBtn = document.getElementById('wake');
  if (wakeBtn && 'wakeLock' in navigator) {
    let sentinel = null;
    const setUI = (on) => {
      wakeBtn.setAttribute('aria-pressed', String(on));
      wakeBtn.textContent = on ? 'Screen staying on' : 'Keep screen on';
    };
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', () => setUI(false));
        setUI(true);
      } catch { setUI(false); }
    };
    wakeBtn.hidden = false;
    wakeBtn.addEventListener('click', async () => {
      if (sentinel) { await sentinel.release(); sentinel = null; setUI(false); }
      else await acquire();
    });
    document.addEventListener('visibilitychange', () => {
      // Wake locks are auto-released when the tab hides; re-acquire on return.
      if (document.visibilityState === 'visible' && wakeBtn.getAttribute('aria-pressed') === 'true') acquire();
    });
  }
})();
