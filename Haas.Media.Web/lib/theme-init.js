// Theme initialization script to prevent hydration mismatches
(function() {
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored || 'system';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  } catch (e) {
    // Fallback to light theme if localStorage is not available
    document.documentElement.classList.add('light');
  }
})();
