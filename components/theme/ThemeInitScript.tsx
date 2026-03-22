import React from 'react';

export function ThemeInitScript() {
  // Runs before React hydration to avoid theme flash.
  const code = `(() => {
  try {
    const key = 'theme';
    const stored = localStorage.getItem(key);
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || stored === 'light' ? stored : (systemDark ? 'dark' : 'light');
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  } catch (e) {
    // no-op
  }
})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
