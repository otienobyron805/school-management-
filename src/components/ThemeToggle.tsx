import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStoredTheme, toggleTheme, ThemeMode } from '../utils/theme';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
      if (customEvent.detail?.theme) {
        setTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener('theme_changed', handleThemeChange);
    return () => window.removeEventListener('theme_changed', handleThemeChange);
  }, []);

  const handleToggle = () => {
    const newTheme = toggleTheme();
    setTheme(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <button
      onClick={handleToggle}
      type="button"
      className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer select-none border ${
        isDark 
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-xs' 
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark mode theme"
    >
      {isDark ? (
        <>
          <Moon className="w-4 h-4 text-amber-300 fill-amber-300/30 animate-in fade-in zoom-in duration-200" />
          {showLabel && <span>Dark Mode</span>}
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20 animate-in fade-in zoom-in duration-200" />
          {showLabel && <span>Light Mode</span>}
        </>
      )}
    </button>
  );
}
