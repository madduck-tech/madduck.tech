(() => {
  const storageKey = 'madduck.language';
  const currentLanguage = document.documentElement.lang;
  const alternateUrl = document.currentScript.dataset.alternateUrl;
  const supported = (language) => language === 'ru' || language === 'en';
  if (!supported(currentLanguage)) return;

  let preferredLanguage;
  try {
    preferredLanguage = localStorage.getItem(storageKey);
    if (!supported(preferredLanguage)) {
      const browserLanguage = navigator.languages?.[0] || navigator.language || 'en';
      preferredLanguage = /^ru(?:-|$)/i.test(browserLanguage) ? 'ru' : 'en';
    }
    // Only redirect when the choice can persist, so blocked storage cannot trap a language switch.
    localStorage.setItem(storageKey, preferredLanguage);
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
      localStorage.setItem(storageKey, link.lang);
    } catch {
      // The ordinary link still works if storage becomes unavailable.
    }
  };
  document.addEventListener('click', rememberLanguage);
  document.addEventListener('auxclick', rememberLanguage);
})();
