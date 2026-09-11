document.documentElement.classList.replace('no-js', 'js');

const menu = document.querySelector('#menu');
const nav = document.querySelector('#site-nav');

menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? menu.dataset.closeLabel : menu.dataset.openLabel);
  menu.textContent = open ? 'CLOSE' : 'MENU';
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', menu.dataset.openLabel);
  if (menu) menu.textContent = 'MENU';
}));

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
}
