import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../assets/js/language-preference.js', import.meta.url), 'utf8');

function visit({ language = 'ru', browser = 'en-US', languages = [browser], saved = null, blocked = false,
  href = 'https://madduck.tech/', alternate = '/en/' } = {}) {
  const location = new URL(href);
  const listeners = {};
  const result = { saved, redirects: [] };
  runInNewContext(source, {
    URL,
    navigator: { languages, language: browser },
    location: {
      href, origin: location.origin, pathname: location.pathname,
      search: location.search, hash: location.hash,
      replace: (url) => result.redirects.push(url),
    },
    localStorage: {
      getItem: () => {
        if (blocked) throw new Error('Storage disabled');
        return typeof result.saved === 'string' ? result.saved : JSON.stringify(result.saved);
      },
      setItem: (key, value) => {
        assert.equal(key, 'madduck.language.v2');
        if (blocked) throw new Error('Storage disabled');
        result.saved = JSON.parse(value);
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

test('first visits remain on the requested language regardless of browser locale', () => {
  for (const browser of ['ru-RU', 'en-US', 'de-DE']) {
    const result = visit({ browser, languages: ['en-US', 'ru-RU'] });
    assert.equal(result.saved, null);
    assert.deepEqual(result.redirects, []);
  }
});

test('a remembered manual choice redirects to the equivalent language page', () => {
  assert.deepEqual(visit({ browser: 'ru-RU', saved: { language: 'en', source: 'manual' } }).redirects,
    ['https://madduck.tech/en/']);
  assert.deepEqual(visit({ saved: { language: 'ru', source: 'manual' } }).redirects, []);
  assert.deepEqual(visit({ language: 'en', saved: { language: 'ru', source: 'manual' }, href: 'https://madduck.tech/en/', alternate: '/' }).redirects,
    ['https://madduck.tech/']);
});

test('manual choices preserve deep links, query strings, and fragments', () => {
  for (const route of ['blog/doom-drodrosophila/', 'experiments/doom-drodrosophila/']) {
    const result = visit({
      href: `https://madduck.tech/site/${route}?debug#experiment`,
      alternate: `/site/en/${route}`,
      saved: { language: 'en', source: 'manual' },
    });
    assert.deepEqual(result.redirects, [`https://madduck.tech/site/en/${route}?debug#experiment`]);
  }
});

test('manual and middle-click switches persist without intercepting navigation', () => {
  for (const [type, button] of [['click', 0], ['auxclick', 1]]) {
    const result = visit();
    result.choose('en', type, button);
    assert.deepEqual(result.saved, { language: 'en', source: 'manual' });
    assert.deepEqual(result.redirects, []);
  }
});

test('invalid preferences and switches do not redirect', () => {
  const result = visit({ saved: 'invalid' });
  result.choose('fr');
  result.choose('en', 'auxclick', 2);
  assert.equal(result.saved, 'invalid');
  assert.deepEqual(result.redirects, []);
});

test('unavailable storage leaves language links usable without redirects', () => {
  assert.deepEqual(visit({ blocked: true }).redirects, []);
  assert.deepEqual(visit({ language: 'en', blocked: true }).redirects, []);
});

test('missing, current-page, and external alternates never redirect', () => {
  for (const alternate of ['', '/', 'https://example.com/en/']) {
    assert.deepEqual(visit({ saved: { language: 'en', source: 'manual' }, alternate }).redirects, []);
  }
});
