import React, { useState } from 'react';
import { Note, LaunchpadColor, NoteMap, isBlackKey, stringToNote, GRID_LAYOUT as GRID_LAYOUT, isBlackNote, DEFAULT_BASE_NOTE, LOWEST_CONTROLLER_NOTE } from '../types/notes';
import NoteInput from './NoteInput';

interface Props {
  onUpdateMapping: (newNoteMap: NoteMap) => void;
  colorSettings: {
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
  };
}

const LinearKeyboardGenerator: React.FC<Props> = ({ onUpdateMapping, colorSettings }) => {
  const [baseNote, setBaseNote] = useState<Note>(DEFAULT_BASE_NOTE);

  const generateLinearLayout = () => {
    const noteMap: NoteMap = {};
    
    // Iterate through the gridLayout structure
    GRID_LAYOUT.forEach((row, _) => {
      row.forEach((source, _) => {
        // Calculate the new note number based on position and steps
        const target = (source + baseNote - LOWEST_CONTROLLER_NOTE) as Note;
                
        // Convert to Note object for determining black/white key
        const isBlackKeyNote = isBlackNote(target);
        
        // Create the note mapping with colors from settings
        noteMap[source] = {
          target: target,
          restColor: isBlackKeyNote ? colorSettings.blackRest : colorSettings.whiteRest,
          pressedColor: isBlackKeyNote ? colorSettings.blackPressed : colorSettings.whitePressed
        };
      });
    });
    
    // Update the parent component with the new mapping
    onUpdateMapping(noteMap);
  };

  return (
    <div className="isomorphic-keyboard-generator">
      <div className="controls-grid">
        <div className="control-group">
          <label>Start Note:</label>
          <div className="note-input-container">
            <NoteInput data={baseNote} onChange={setBaseNote} />
            <div className="note-stepper">
              <button 
                onClick={() => {
                  if (baseNote < 127) {
                    setBaseNote((baseNote + 1) as Note);
                  }
                }}
                disabled={baseNote >= 127}
              >▲</button>
              <button 
                onClick={() => {
                  if (baseNote > 0) {
                    setBaseNote((baseNote - 1) as Note);
                  }
                }}
                disabled={baseNote <= 0}
              >▼</button>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={generateLinearLayout}
        className="generate-button"
      >
        Generate Layout
      </button>
    </div>
  );
};

export default LinearKeyboardGenerator; 