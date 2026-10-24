import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label={`Current mode is ${isDark ? 'Dark' : 'Light'}. Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      title={`Theme: ${isDark ? 'Dark' : 'Light'} Mode (Click to switch to ${isDark ? 'Light' : 'Dark'} mode)`}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      className={`group relative inline-flex items-center h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-matteSage focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel ${
        isDark
          ? 'bg-[#121315] border-white/20 hover:border-matteSage/70'
          : 'bg-[#DFDCD4] border-black/20 hover:border-grayGreen/70'
      } ${className}`}
    >
      <span className="sr-only">Toggle light and dark mode</span>

      {/* Track Background Static Icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none select-none">
        <Sun
          className={`w-3 h-3 transition-opacity duration-200 ${
            isDark ? 'opacity-60 text-greige' : 'opacity-0 text-[#B58A58]'
          }`}
          aria-hidden="true"
        />
        <Moon
          className={`w-3 h-3 transition-opacity duration-200 ${
            isDark ? 'opacity-0 text-matteSage' : 'opacity-75 text-[#303338]'
          }`}
          aria-hidden="true"
        />
      </span>

      {/* Sliding Thumb with Current Mode Icon */}
      <span
        className={`pointer-events-none inline-flex items-center justify-center h-4.5 w-4.5 transform rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
          isDark
            ? 'translate-x-[22px] bg-grayGreen text-fullWhite border border-matteSage/40'
            : 'translate-x-[2px] bg-[#D5C188] text-[#18191C] border border-black/10'
        }`}
      >
        {isDark ? (
          <Moon className="w-2.5 h-2.5 text-fullWhite stroke-[2.5]" aria-hidden="true" />
        ) : (
          <Sun className="w-2.5 h-2.5 text-[#18191C] stroke-[2.5]" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
