import React, { useRef, useEffect, useState } from 'react';
import { LaunchpadColors, launchpadColorToHexString, getTextColor } from '../types/colors';
import { LaunchpadColor } from '../types/notes';

interface FloatingColorPickerProps {
  value: LaunchpadColor;
  onChange: (value: LaunchpadColor) => void;
  onClose: () => void;
  position?: 'center' | 'relative';
  style?: React.CSSProperties;
}

const FloatingColorPicker: React.FC<FloatingColorPickerProps> = ({
  value,
  onChange,
  onClose,
  position = 'relative',
  style = {}
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const baseStyle: React.CSSProperties = {
    position: position === 'center' ? 'fixed' : 'absolute',
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    zIndex: 9999,
    ...(position === 'center' ? {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    } : {}),
    ...style
  };

  return (
    <div ref={pickerRef} style={baseStyle} className="floating-color-picker">
      <input
        type="text"
        placeholder="Search colors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="color-search"
      />
      <div className="color-grid">
        {Object.entries(LaunchpadColors).map(([codeAsForcedString, hexColor]) => {
          const code: LaunchpadColor = parseInt(codeAsForcedString);
          const hexCode = Number(code).toString(16).padStart(2, '0').toUpperCase();
          return (
            <div
              key={code}
              className={`color-option ${code === value ? 'selected' : ''}`}
              style={{ 
                backgroundColor: hexColor,
                color: getTextColor(code)
              }}
              onClick={() => onChange(code)}
              title={`Color ${hexCode}`}
            >
              {hexCode}
            </div>
          )}
        )}
      </div>
    </div>
  );
};

export default FloatingColorPicker; 