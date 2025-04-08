import React, { useState } from 'react';
import { NoteMapping, NoteState } from '../types';
import { launchpadColorToHexString, getTextColor } from '../types/colors';
import FloatingColorPicker from './FloatingColorPicker';
import { stringToNote, Note, LaunchpadColor, NoteMap, noteToString, GRID_LAYOUT } from '../types/notes';

interface GridKeyboardProps {
  activeKeys: NoteState;
  onKeyPress: (note: Note) => void;
  onKeyRelease: (note: Note) => void;
  noteMap: NoteMap;
  setNoteMap: (noteMap: NoteMap) => void;
}

const GridKeyboard: React.FC<GridKeyboardProps> = ({ onKeyPress: onNotePress, onKeyRelease: onNoteRelease, setNoteMap, activeKeys, noteMap }) => {
  const [editingCell, setEditingCell] = useState<Note | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [colorPickerCell, setColorPickerCell] = useState<Note | null>(null);

  const handleEditSubmit = () => {
    if (editingCell) {
      const parsedNote = stringToNote(editValue);
      
      if (parsedNote !== null && noteMap[editingCell]) {
        const newNoteMap = {...noteMap};
        newNoteMap[editingCell] = {
          ...newNoteMap[editingCell],
          target: parsedNote
        };
        setNoteMap(newNoteMap);
      }
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditStart = (src: Note) => {
    setEditingCell(src);
    setEditValue(noteToString(noteMap[src].target));
  };

  const handleColorChange = (colorCode: LaunchpadColor) => {
    if (colorPickerCell) {
      const mapping = noteMap[colorPickerCell];
      if (mapping) {
        const newnoteMap = {...noteMap};
        newnoteMap[colorPickerCell] = {
          ...newnoteMap[colorPickerCell],
          ['restColor']: colorCode
        };
        setNoteMap(newnoteMap);
        setColorPickerCell(null);
      }
    }
  };

  const noteComponent = (src: Note) => (
    <div
      key={`cell-${src}`}
      className={`grid-cell ${activeKeys[src] ? 'active' : ''}`}
      style={{
        backgroundColor: launchpadColorToHexString(activeKeys[src] ? noteMap[src].pressedColor : noteMap[src].restColor) 
      }}
      onMouseDown={(e) => {
        if (!e.defaultPrevented) {
          onNotePress(src);
        }
      }}
      onMouseUp={() => onNoteRelease(src)}
      onMouseLeave={() => activeKeys[src] && onNoteRelease(src)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setColorPickerCell(src);
      }} >
      {editingCell === src ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditSubmit}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="cell-content">
          <div 
            className="note-name" 
            style={{
              color: getTextColor(activeKeys[src] ? noteMap[src].pressedColor : noteMap[src].restColor)
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEditStart(src);
            }}
          >{noteToString(noteMap[src].target)}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid-keyboard-container">
      <div className="grid-keyboard">
        <div className="grid-container">
          {GRID_LAYOUT.toReversed().map(row => (
            <div key={`row-${row}`} className="grid-row">{row.map(src => noteComponent(src))}</div>))}
        </div> 
      </div> 
      {colorPickerCell && (
        <FloatingColorPicker
          value={noteMap[colorPickerCell].restColor}
          onChange={handleColorChange}
          onClose={() => setColorPickerCell(null)}
          position="center"
        />
      )}
    </div>
  );
};

export default GridKeyboard; 