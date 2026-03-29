import { useState, useEffect } from 'react';

export function useDarkMode(forcedMode = null) {
  const [isDark, setIsDark] = useState(() => {
    if (forcedMode === 'dark') return true;
    if (forcedMode === 'light') return false;
    return localStorage.getItem('resmvp_dark_mode') === 'true';
  });

  useEffect(() => {
    if (forcedMode === 'dark') {
      document.documentElement.classList.add('dark');
      return;
    }
    if (forcedMode === 'light') {
      document.documentElement.classList.remove('dark');
      return;
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('resmvp_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('resmvp_dark_mode', 'false');
    }
  }, [isDark, forcedMode]);

  const toggleDarkMode = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (forcedMode) {
      alert("Theme switching coming soon!");
      return;
    }
    setIsDark(!isDark);
  };

  return { isDark: forcedMode ? forcedMode === 'dark' : isDark, toggleDarkMode };
}
