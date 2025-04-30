import type { LaunchpadColor } from './notes';

// Launchpad Mini color data - using hexadecimal numbers as keys
export const LaunchpadColors: Record<LaunchpadColor, string> = {
  0x00: '#616161',
  0x01: '#b3b3b3',
  0x02: '#dddddd',
  0x03: '#ffffff',
  0x04: '#ffb3b3',
  0x05: '#ff6161',
  0x06: '#dd6161',
  0x07: '#b36161',
  0x08: '#fff3d5',
  0x09: '#ffb361',
  0x0A: '#dd8c61',
  0x0B: '#b37661',
  0x0C: '#ffeea1',
  0x0D: '#ffff61',
  0x0E: '#dddd61',
  0x0F: '#b3b361',
  0x10: '#ddffa1',
  0x11: '#c2ff61',
  0x12: '#a1dd61',
  0x13: '#81b361',
  0x14: '#c2ffb3',
  0x15: '#61ff61',
  0x16: '#61dd61',
  0x17: '#61b361',
  0x18: '#c2ffc2',
  0x19: '#61ff8c',
  0x1A: '#61dd76',
  0x1B: '#61b36b',
  0x1C: '#c2ffcc',
  0x1D: '#61ffcc',
  0x1E: '#61dda1',
  0x1F: '#61b381',
  0x20: '#c2fff3',
  0x21: '#61ffe9',
  0x22: '#61ddc2',
  0x23: '#61b396',
  0x24: '#c2f3ff',
  0x25: '#61eeff',
  0x26: '#61c7dd',
  0x27: '#61a1b3',
  0x28: '#c2ddff',
  0x29: '#61c7ff',
  0x2A: '#61a1dd',
  0x2B: '#6181b3',
  0x2C: '#a18cff',
  0x2D: '#6161ff',
  0x2E: '#6161dd',
  0x2F: '#6161b3',
  0x30: '#ccb3ff',
  0x31: '#a161ff',
  0x32: '#8161dd',
  0x33: '#7661b3',
  0x34: '#ffb3ff',
  0x35: '#ff61ff',
  0x36: '#dd61dd',
  0x37: '#b361b3',
  0x38: '#ffb3d5',
  0x39: '#ff61c2',
  0x3A: '#dd61a1',
  0x3B: '#b3618c',
  0x3C: '#ff7661',
  0x3D: '#e9b361',
  0x3E: '#ddc261',
  0x3F: '#a1a161',
  0x40: '#61b361',
  0x41: '#61b38c',
  0x42: '#618cd5',
  0x43: '#6161ff',
  0x44: '#61b3b3',
  0x45: '#8c61f3',
  0x46: '#ccb3c2',
  0x47: '#8c7681',
  0x48: '#ff6161',
  0x49: '#f3ffa1',
  0x4A: '#eefc61',
  0x4B: '#ccff61',
  0x4C: '#76dd61',
  0x4D: '#61ffcc',
  0x4E: '#61e9ff',
  0x4F: '#61a1ff',
  0x50: '#8c61ff',
  0x51: '#cc61fc',
  0x52: '#ee8cdd',
  0x53: '#a17661',
  0x54: '#ffa161',
  0x55: '#ddf961',
  0x56: '#d5ff8c',
  0x57: '#61ff61',
  0x58: '#b3ffa1',
  0x59: '#ccfcd5',
  0x5A: '#b3fff6',
  0x5B: '#cce4ff',
  0x5C: '#a1c2f6',
  0x5D: '#d5c2f9',
  0x5E: '#f98cff',
  0x5F: '#ff61cc',
  0x60: '#ffc261',
  0x61: '#f3ee61',
  0x62: '#e4ff61',
  0x63: '#ddcc61',
  0x64: '#b3a161',
  0x65: '#61ba76',
  0x66: '#76c28c',
  0x67: '#8181a1',
  0x68: '#818ccc',
  0x69: '#ccaa81',
  0x6A: '#dd6161',
  0x6B: '#f9b3a1',
  0x6C: '#f9ba76',
  0x6D: '#fff38c',
  0x6E: '#e9f9a1',
  0x6F: '#d5ee76',
  0x70: '#8181a1',
  0x71: '#f9f9d5',
  0x72: '#ddfce4',
  0x73: '#e9e9ff',
  0x74: '#e4d5ff',
  0x75: '#b3b3b3',
  0x76: '#d5d5d5',
  0x77: '#f9ffff',
  0x78: '#e96161',
  0x79: '#aa6161',
  0x7A: '#81f661',
  0x7B: '#61b361',
  0x7C: '#f3ee61',
  0x7D: '#b3a161',
  0x7E: '#eec261',
  0x7F: '#c27661'
};

// Get hex color from color code
export const launchpadColorToHexString = (colorCode: LaunchpadColor): string => {
  return LaunchpadColors[colorCode] || '#000000';
};

// Get text color based on background color
export const getTextColor = (colorCode: LaunchpadColor): string => {
  const hex = LaunchpadColors[colorCode];
  if (!hex) return '#ffffff';
  
  // Parse hex color
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  // Calculate relative luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const launchpadColorToString = (color: LaunchpadColor): string => {
  return Number(color).toString(16).padStart(2, '0').toUpperCase()
}