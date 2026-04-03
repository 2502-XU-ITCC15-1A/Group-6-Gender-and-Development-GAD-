document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  if (!body) return;

  const saved = window.localStorage.getItem('gadims_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');

  const applyTheme = (theme) => {
    body.setAttribute('data-theme', theme);
    window.localStorage.setItem('gadims_theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
      toggle.textContent = theme === 'dark' ? '☼' : '☾';
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode');
      toggle.title = theme === 'dark' ? 'Day mode' : 'Night mode';
    });
  };

  applyTheme(initial);

  const toggleTheme = () => {
    const current = body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', toggleTheme);
    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleTheme();
    });
  });
});
