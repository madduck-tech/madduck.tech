(() => {
  // The old key mixed automatic detection with explicit choices and cannot be migrated reliably.
  const storageKey = 'madduck.language.v2';
  const currentLanguage = document.documentElement.lang;
  const alternateUrl = document.currentScript.dataset.alternateUrl;
  const supported = (language) => language === 'ru' || language === 'en';
  if (!supported(currentLanguage)) return;

  let preferredLanguage;
  try {
    const saved = localStorage.getItem(storageKey);
    let preference;
    try {
      preference = JSON.parse(saved);
    } catch {
      // Ignore malformed preferences and detect the browser language again.
    }
    const manual = preference?.source === 'manual' && supported(preference.language);
    const browserLanguages = [...(navigator.languages || []), navigator.language];
    preferredLanguage = manual ? preference.language
      : browserLanguages.some((language) => /^ru(?:-|$)/i.test(language)) ? 'ru' : 'en';
    // Only redirect when the choice can persist, so blocked storage cannot trap a language switch.
    localStorage.setItem(storageKey, JSON.stringify({
      language: preferredLanguage,
      source: manual ? 'manual' : 'browser',
    }));
  } catch {
    return;
  }

  if (preferredLanguage !== currentLanguage && alternateUrl) {
    const destination = new URL(alternateUrl, location.href);
    if (destination.origin === location.origin && destination.pathname !== location.pathname) {
      destination.search = location.search;
      destination.hash = location.hash;
      location.replace(destination.href);
      return;
    }
  }

  const rememberLanguage = (event) => {
    if (event.button > 1) return;
    const link = event.target.closest('a[data-language-switch]');
    if (!link || !supported(link.lang)) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ language: link.lang, source: 'manual' }));
    } catch {
      // The ordinary link still works if storage becomes unavailable.
    }
  };
  document.addEventListener('click', rememberLanguage);
  document.addEventListener('auxclick', rememberLanguage);
})();
