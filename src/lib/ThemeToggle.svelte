<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';

  export let theme: 'light' | 'dark';
  const dispatch = createEventDispatcher<{
    themeChange: 'light' | 'dark';
  }>();

  let isDarkMode = false;

  // Check if it's night time (between 6 PM and 6 AM)
  const isNightTime = () => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  };

  onMount(() => {
    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      // Use saved theme if available
      isDarkMode = savedTheme === 'dark';
      dispatch('themeChange', savedTheme as 'light' | 'dark');
    } else {
      // Otherwise use time-based theme
      const darkMode = isNightTime();
      isDarkMode = darkMode;
      dispatch('themeChange', darkMode ? 'dark' : 'light');
    }
    
    // Set up interval to check time every minute
    const interval = setInterval(() => {
      // Only update based on time if no theme is saved in localStorage
      if (!localStorage.getItem('theme')) {
        const shouldBeDark = isNightTime();
        if (shouldBeDark !== isDarkMode) {
          isDarkMode = shouldBeDark;
          dispatch('themeChange', shouldBeDark ? 'dark' : 'light');
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  });

  // Manual toggle function
  function toggleTheme() {
    const newTheme = isDarkMode ? 'light' : 'dark';
    isDarkMode = !isDarkMode;
    dispatch('themeChange', newTheme);
    // Save preference to localStorage
    localStorage.setItem('theme', newTheme);
  }

  // Always render an icon, even if state is undefined
  $: icon = isDarkMode ? '☀️' : '🌙';
</script>

<button 
  class="theme-toggle" 
  on:click={toggleTheme}
  aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
  type="button"
>
  {icon}
</button>

<style>
  .theme-toggle {
    position: absolute;
    top: 20px;
    right: 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 24px;
    color: var(--text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    transition: background-color var(--transition-speed);
    z-index: 1000;
    padding: 0;
    line-height: 1;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .theme-toggle:hover {
    background-color: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
  }

  [data-theme="dark"] .theme-toggle:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  [data-theme="dark"] .theme-toggle {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  }
</style> 