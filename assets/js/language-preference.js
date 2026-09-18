(() => {
  const storageKey = 'madduck.language.v2';
  const currentLanguage = document.documentElement.lang;
  const alternateUrl = document.currentScript.dataset.alternateUrl;
  const supported = (language) => language === 'ru' || language === 'en';
  if (!supported(currentLanguage)) return;

  let manualLanguage;
  try {
    const preference = JSON.parse(localStorage.getItem(storageKey));
    if (preference?.source === 'manual' && supported(preference.language)) {
      manualLanguage = preference.language;
    }
  } catch {
    // A missing, malformed, or unavailable preference must not change the URL.
  }

  // Keep every localized URL crawlable. Only redirect after an explicit user choice.
  if (manualLanguage && manualLanguage !== currentLanguage && alternateUrl) {
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
