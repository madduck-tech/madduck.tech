import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../assets/js/language-preference.js', import.meta.url), 'utf8');

function visit({ language = 'ru', browser = 'en-US', saved = null, blocked = false,
  href = 'https://madduck.tech/', alternate = '/en/' } = {}) {
  const location = new URL(href);
  const listeners = {};
  const result = { saved, redirects: [] };
  runInNewContext(source, {
    URL,
    navigator: { languages: [browser], language: browser },
    location: {
      href, origin: location.origin, pathname: location.pathname,
      search: location.search, hash: location.hash,
      replace: (url) => result.redirects.push(url),
    },
    localStorage: {
      getItem: () => result.saved,
      setItem: (key, value) => {
        assert.equal(key, 'madduck.language');
        if (blocked) throw new Error('Storage disabled');
        result.saved = value;
      },
    },
    document: {
      documentElement: { lang: language },
      currentScript: { dataset: { alternateUrl: alternate } },
      addEventListener: (type, callback) => { listeners[type] = callback; },
    },
  });
  result.choose = (lang, type = 'click', button = 0) => listeners[type]?.({
    button, target: { closest: (selector) => {
      assert.equal(selector, 'a[data-language-switch]');
      return { lang };
    } },
  });
  return result;
}

test('first visit uses the primary browser language and remembers it', () => {
  for (const browser of ['ru', 'ru-RU', 'ru-BY', 'RU-ru']) {
    const result = visit({ browser });
    assert.equal(result.saved, 'ru');
    assert.deepEqual(result.redirects, []);
  }
  for (const browser of ['en-US', 'de-DE', 'uk-UA', 'fr-RU']) {
    const result = visit({ browser });
    assert.equal(result.saved, 'en');
    assert.deepEqual(result.redirects, ['https://madduck.tech/en/']);
  }
});

test('a remembered choice overrides the browser language on later visits', () => {
  assert.deepEqual(visit({ browser: 'ru-RU', saved: 'en' }).redirects, ['https://madduck.tech/en/']);
  assert.deepEqual(visit({ saved: 'ru' }).redirects, []);
  assert.deepEqual(visit({ language: 'en', saved: 'ru', href: 'https://madduck.tech/en/', alternate: '/' }).redirects,
    ['https://madduck.tech/']);
});

test('deep links keep the equivalent page, deployment prefix, query and fragment', () => {
  for (const route of ['blog/doom-drodrosophila/', 'experiments/doom-drodrosophila/']) {
    const result = visit({ href: `https://madduck.tech/site/${route}?debug#experiment`, alternate: `/site/en/${route}` });
    assert.deepEqual(result.redirects, [`https://madduck.tech/site/en/${route}?debug#experiment`]);
  }
});

test('manual and middle-click switches persist without intercepting navigation', () => {
  for (const [type, button] of [['click', 0], ['auxclick', 1]]) {
    const result = visit({ browser: 'ru' });
    result.choose('en', type, button);
    assert.equal(result.saved, 'en');
    assert.deepEqual(result.redirects, []);
    assert.deepEqual(visit({ language: 'en', browser: 'ru', saved: result.saved }).redirects, []);
  }
});

test('invalid saved values fall back to the browser; invalid switches are ignored', () => {
  const result = visit({ browser: 'ru', saved: 'invalid' });
  result.choose('fr');
  result.choose('en', 'auxclick', 2);
  assert.equal(result.saved, 'ru');
});

test('unavailable storage leaves ordinary language links usable without redirect loops', () => {
  assert.deepEqual(visit({ blocked: true }).redirects, []);
  assert.deepEqual(visit({ language: 'en', browser: 'ru', blocked: true }).redirects, []);
});

test('missing, current-page and external alternates never redirect', () => {
  for (const alternate of ['', '/', 'https://example.com/en/']) {
    assert.deepEqual(visit({ alternate }).redirects, []);
  }
});
