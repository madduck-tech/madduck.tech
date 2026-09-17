// Run this function with Playwright MCP's browser_run_code_unsafe filename option.
// The tool requires a single expression with no leading or trailing semicolon.
async (page) => {
  const tab = await page.context().newPage();
  const results = [];
  const errors = [];
  tab.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, name) => {
    if (!condition) throw new Error(name);
    results.push(name);
  };
  const base = 'http://127.0.0.1:4174';
  try {
    await tab.emulateMedia({ reducedMotion: 'reduce' });
    await tab.addInitScript(() => {
      // Hold rendering after asset initialization to inspect the loading boundary.
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      const pending = new Map();
      let open = false,
        nextId = -1;
      window.requestAnimationFrame = (callback) => {
        if (open) return request(callback);
        const id = nextId--;
        pending.set(id, callback);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        if (!pending.delete(id)) cancel(id);
      };
      window.releaseFirstFrame = () => {
        open = true;
        for (const callback of pending.values()) request(callback);
        pending.clear();
      };
    });
    for (const [path, language, title] of [
      ['/experiments/doom-drodrosophila/', 'ru', 'МУХА В DOOM'],
      ['/en/experiments/doom-drodrosophila/', 'en', 'A FLY IN DOOM'],
    ]) {
      await tab.goto(`${base}${path}?debug`);
      await tab.waitForFunction(() => window.flyLab, null, { polling: 20 });
      check(
        await tab.evaluate(
          () =>
            !document.querySelector('#lab-loading').hidden &&
            window.flyLab.snapshot().resources.drawCalls === 0 &&
            [...document.querySelectorAll('.transport button, .transport select')].every(
              (el) => el.disabled,
            ),
        ),
        `${language}: loader stays visible before the first frame`,
      );
      await tab.evaluate(() => window.releaseFirstFrame());
      await tab.waitForFunction(() => window.flyLab.snapshot().resources.drawCalls > 0);
      check(
        await tab.evaluate(
          () =>
            document.querySelector('#lab-loading').hidden &&
            [...document.querySelectorAll('.transport button, .transport select')].every(
              (el) => !el.disabled,
            ),
        ),
        `${language}: first rendered frame dismisses the loader and enables controls`,
      );
      check((await tab.locator('h1').textContent()) === title, `${language}: localized title`);
      check((await tab.locator('html').getAttribute('lang')) === language, `${language}: language`);
      const alternate =
        language === 'ru'
          ? '/en/experiments/doom-drodrosophila/'
          : '/experiments/doom-drodrosophila/';
      check(
        (await tab.locator('link[rel="canonical"]').getAttribute('href')) ===
          `https://madduck.tech${path}` &&
          (await tab
            .locator(`link[hreflang="${language === 'ru' ? 'en' : 'ru'}"]`)
            .getAttribute('href')) === `https://madduck.tech${alternate}` &&
          (await tab.locator('link[hreflang="x-default"]').getAttribute('href')) ===
            'https://madduck.tech/experiments/doom-drodrosophila/' &&
          (await tab.locator('.lab-language').getAttribute('href')) === alternate,
        `${language}: renamed canonical, alternates and language switch`,
      );
      check(
        !(await tab.locator('.lab-header').innerText()).includes('55.7558'),
        `${language}: no decorative coordinates`,
      );
      check(
        (await tab.locator('#current-region').locator('..').locator('span').textContent()) ===
          (language === 'ru' ? 'ТЕКУЩИЙ СЕКТОР' : 'CURRENT SECTOR'),
        `${language}: current sector label`,
      );
      check(
        (await tab.locator('#coverage-count').locator('..').locator('span').textContent()) ===
          (language === 'ru' ? 'МУХА ПОБЫВАЛА В ОБЛАСТЯХ' : 'AREAS VISITED BY THE FLY') &&
          (await tab.locator('#coverage-count').textContent()) === '0/72',
        `${language}: visited areas without round counter`,
      );
      check(
        await tab.evaluate(() => window.flyLab.snapshot().time === 0),
        `${language}: reduced motion starts paused`,
      );
      for (const width of [1440, 390, 320]) {
        await tab.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
        const layout = await tab.evaluate(() => {
          const brain = document.querySelector('.viewport-brain').getBoundingClientRect();
          const stage = document.querySelector('.viewport-grid').getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            fraction: (brain.width * brain.height) / (stage.width * stage.height),
            right: brain.right <= stage.right,
            labels: [...document.querySelectorAll('[data-signal], .instrument-bar > div')].every(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ),
          };
        });
        check(!layout.overflow && layout.right, `${language}/${width}: no overflow`);
        check(
          layout.fraction >= 0.15 && layout.fraction <= 0.2,
          `${language}/${width}: brain footprint`,
        );
        check(layout.labels, `${language}/${width}: readable signal labels`);
      }
    }
    await tab.locator('#play-toggle').click();
    await tab.waitForTimeout(300);
    check(await tab.evaluate(() => window.flyLab.snapshot().time > 0), 'Explicit playback');
    await tab.locator('#play-toggle').click();
    const paused = await tab.evaluate(() => window.flyLab.snapshot());
    await tab.waitForTimeout(300);
    const after = await tab.evaluate(() => window.flyLab.snapshot());
    check(
      paused.time === after.time &&
        JSON.stringify(paused.signals) === JSON.stringify(after.signals),
      'Pause freezes time and activity',
    );
    await tab.locator('#replay').click();
    check(
      await tab.evaluate(
        () => window.flyLab.snapshot().time === 0 && window.flyLab.snapshot().visited === 0,
      ),
      'Reset',
    );
    await tab.locator('#speed').selectOption('2');
    check(await tab.evaluate(() => window.flyLab.snapshot().speed === 2), 'Speed selector');
    await tab.locator('#fly-canvas').focus();
    await tab.keyboard.press('Space');
    check(await tab.evaluate(() => window.flyLab.snapshot().playing), 'Focused Space shortcut');
    await tab.keyboard.press('Space');
    const box = await tab.locator('#fly-canvas').boundingBox();
    await tab.mouse.move(box.x + 30, box.y + box.height * 0.6);
    await tab.mouse.down();
    await tab.mouse.move(box.x + 100, box.y + box.height * 0.6, { steps: 8 });
    await tab.mouse.up();
    check(
      await tab.evaluate(() => window.flyLab.snapshot().following),
      'Orbit keeps following the fly',
    );
    await tab.locator('#reset-view').click();
    check(
      await tab.evaluate(() => window.flyLab.snapshot().following),
      'Reset view keeps following',
    );
    const network = await tab.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter(
          (e) =>
            e.name.startsWith('http') &&
            (!e.name.startsWith(location.origin) || e.responseStatus >= 400),
        ),
    );
    check(network.length === 0, 'All production requests local and successful');
    check(errors.length === 0, `No uncaught browser errors: ${errors.join('; ')}`);
    return results;
  } finally {
    await tab.close();
  }
}
