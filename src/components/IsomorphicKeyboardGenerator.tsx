import React, { useState } from 'react';
import { Note, LaunchpadColor, NoteMap, isBlackKey, stringToNote, GRID_LAYOUT as GRID_LAYOUT, isBlackNote, DEFAULT_BASE_NOTE } from '../types/notes';
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

const IsomorphicKeyboardGenerator: React.FC<Props> = ({ onUpdateMapping, colorSettings }) => {
  const [startNote, setStartNote] = useState<Note>(DEFAULT_BASE_NOTE);
  const [horizontalStep, setHorizontalStep] = useState<number>(4);
  const [verticalStep, setVerticalStep] = useState<number>(3);

  const generateIsomorphicLayout = (startNote: Note) => {
    const noteMap: NoteMap = {};
    
    // Iterate through the gridLayout structure
    GRID_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((source, colIndex) => {
        // Calculate the new note number based on position and steps
        const target = (startNote + 
          (colIndex * horizontalStep) + // Horizontal movement
          (rowIndex * verticalStep)     // Vertical movement
        ) as Note;
                
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
            <NoteInput data={startNote} onChange={setStartNote} />
            <div className="note-stepper">
              <button 
                onClick={() => {
                  if (startNote < 127) {
                    setStartNote((startNote + 1) as Note);
                    generateIsomorphicLayout(startNote + 1);
                  }
                }}
                disabled={startNote >= 127}
              >▲</button>
              <button 
                onClick={() => {
                  if (startNote > 0) {
                    setStartNote((startNote - 1) as Note);
                    generateIsomorphicLayout(startNote - 1);
                  }
                }}
                disabled={startNote <= 0}
              >▼</button>
            </div>
          </div>
        </div>
        <div className="control-group">
          <label>Horizontal Step:</label>
          <input
            type="number"
            value={horizontalStep}
            onChange={(e) => setHorizontalStep(parseInt(e.target.value) || 0)}
            min={-12}
            max={12}
          />
        </div>
        <div className="control-group">
          <label>Vertical Step:</label>
          <input
            type="number"
            value={verticalStep}
            onChange={(e) => setVerticalStep(parseInt(e.target.value) || 0)}
            min={-12}
            max={12}
          />
        </div>
      </div>
      <button
        onClick={() => generateIsomorphicLayout(startNote)}
        className="generate-button"
      >
        Generate Layout
      </button>
    </div>
  );
};

export default IsomorphicKeyboardGenerator; 