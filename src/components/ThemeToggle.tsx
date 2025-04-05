import React, { useEffect, useState } from 'react';

interface ThemeToggleProps {
  onThemeChange: (theme: 'light' | 'dark') => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ onThemeChange }) => {
  // Initialize state based on current theme attribute, localStorage, or time
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // First check if theme is already set in document
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme) {
      return currentTheme === 'dark';
    }
    
    // Then check localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    
    // Otherwise check time
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  });

  // Check if it's night time (between 6 PM and 6 AM)
  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  // Initialize theme based on time or saved preference
  useEffect(() => {
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // Use saved theme if available
      setIsDarkMode(savedTheme === 'dark');
      onThemeChange(savedTheme as 'light' | 'dark');
    } else {
      // Otherwise use time-based theme
      const darkMode = isNightTime();
      setIsDarkMode(darkMode);
      onThemeChange(darkMode ? 'dark' : 'light');
    }
    
    // Set up interval to check time every minute
    const interval = setInterval(() => {
      // Only update based on time if no theme is saved in localStorage
      if (!localStorage.getItem('theme')) {
        const shouldBeDark = isNightTime();
        if (shouldBeDark !== isDarkMode) {
          setIsDarkMode(shouldBeDark);
          onThemeChange(shouldBeDark ? 'dark' : 'light');
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [isDarkMode, onThemeChange]);

  // Manual toggle function
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    onThemeChange(newTheme);
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
  };

  // Always render an icon, even if state is undefined
  const icon = isDarkMode ? '☀️' : '🌙';

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
    >
      {icon}
    </button>
  );
};

export default ThemeToggle; 