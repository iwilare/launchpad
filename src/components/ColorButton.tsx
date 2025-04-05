import React, { useState } from 'react';
import { launchpadColorToHexString, getTextColor, launchpadColorToString } from '../types/colors';
import FloatingColorPicker from './FloatingColorPicker';
import { LaunchpadColor } from '../types/notes';

interface ColorButtonProps {
  value: LaunchpadColor;
  onChange: (value: LaunchpadColor) => void;
}

const ColorButton: React.FC<ColorButtonProps> = ({
  value,
  onChange
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="color-button-container">
      <div
        className="color-preview"
        style={{
          backgroundColor: launchpadColorToHexString(value),
          color: getTextColor(value)
        }}
        onClick={() => setShowPicker(true)}
      >
        {launchpadColorToString(value)}
      </div>
      {showPicker && (
        <FloatingColorPicker
          value={value}
          onChange={(newValue) => {
            onChange(newValue);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}
        />
      )}
    </div>
  );
};

export default ColorButton; 