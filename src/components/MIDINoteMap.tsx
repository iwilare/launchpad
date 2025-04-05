import React, { useState, useEffect } from 'react';
import { NoteMapping, LaunchpadColor, NoteMap, Note, noteToNoteRepr, niceNoteMapStringToNoteMap, isBlackNote } from '../types/notes';
import { launchpadColorToHexString } from '../types/colors';
import { noteToString, isBlackKey, stringToNote } from '../types/notes';
import ColorButton from './ColorButton';

interface Props {
  noteMap: NoteMap;
  onUpdateMapping: (newNoteMap: NoteMap) => void;
}

const MIDINoteMap: React.FC<Props> = ({ noteMap, onUpdateMapping }) => {
  const [showJson, setShowJson] = useState<boolean>(false);
  const [jsonValue, setJsonValue] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');
  const [invalidInputs, setInvalidInputs] = useState<{[key: Note]: boolean}>({});
  
  const handleColorChange = (note: Note, color: LaunchpadColor) => {
    const updatedMapping = { ...noteMap[note], restColor: color };
    const newNoteMap: NoteMap = { ...noteMap, [note]: updatedMapping };
    onUpdateMapping(newNoteMap);
  };

  const handleNoteChange = (note: Note, newNote: Note) => {
    const updatedMapping = { ...noteMap[note], note: newNote };
    const newNoteMap: NoteMap = { ...noteMap, [note]: updatedMapping };
    onUpdateMapping(newNoteMap);
  };

  const handleNoteNameChange = (note: Note, noteName: string) => {
    
    const parsedNote = stringToNote(noteName);
    setInvalidInputs(prev => ({
      ...prev,
      [note]: noteName !== '' && !parsedNote
    }));
    
    if (parsedNote) {
      const updatedMapping = { ...noteMap[note], key: parsedNote };
      const newNoteMap: NoteMap = { ...noteMap, [note]: updatedMapping };
      onUpdateMapping(newNoteMap);
    }
  };

  const updateJsonValue = (mappings: NoteMap) => {
    const formattedJson = '[\n' + 
      Object.entries(mappings).map(([sourceAsForcedString, mapping]) => '  ' + JSON.stringify({
        from: noteToString(parseInt(sourceAsForcedString)),
        to: noteToNoteRepr(mapping.target),
        restColor: mapping.restColor,
        pressedColor: mapping.pressedColor
      })).join(',\n') +
      '\n]';
    setJsonValue(formattedJson);
  };

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    try {
      const asd = niceNoteMapStringToNoteMap(value);

      if (typeof asd === 'string') {
        setJsonError(asd);
        return;
      } else {
        setJsonError('');
        onUpdateMapping(asd);
      }
    } catch (e) {
      setJsonError('Invalid JSON format');
    }
  };

  const tableEntry = (key: Note, mapping: NoteMapping) => (
    <tr key={key} className={isBlackNote(mapping.target) ? 'black-key' : ''}>
      <td>{key}</td>
      <td>
        <input
          type="text"
          value={noteToString(noteMap[key].target)}
          onChange={(e) => handleNoteNameChange(key, e.target.value)}
          maxLength={4}
          placeholder="C4"
          title="Enter note name (e.g., C4, C#3)"
        />
      </td>
      <td>
        <ColorButton
          value={mapping.restColor}
          onChange={(value) => handleColorChange(key, value)}
        />
      </td>
      <td>
        <ColorButton
          value={mapping.pressedColor}
          onChange={(value) => handleColorChange(key, value)}
        />
      </td>
    </tr>
  );

  const renderTable = (mappings: NoteMap, startIndex: number, howMany: number) => (
    <table className="note-map-table">
      <thead>
        <tr>
          <th>Code</th>
          <th>Note</th>
          <th>Rest</th>
          <th>Pressed</th>
        </tr>
      </thead>
      <tbody>{Array.from({length: howMany}, (_, i) => ( tableEntry(startIndex + i, mappings[startIndex + i]) ))}</tbody>
    </table>
  );

  return (
    <div className="midi-note-map">
      <div className="note-map-header">
        <h3>MIDI Note Mappings</h3>
        <div>
          <button 
            className="toggle-json-button"
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? 'Show Table View' : 'Show JSON View'}
          </button>
        </div>
      </div>
      <div className="mapping-content">
        {showJson ? (
          <div className="json-editor">
            <textarea
              value={jsonValue}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
            />
            {jsonError && <div className="json-error">{jsonError}</div>}
          </div>
        ) : (
          <div className="note-map-table-container">
            {renderTable(noteMap, 36, 21)}
            {renderTable(noteMap, 57, 21)}
            {renderTable(noteMap, 78, 22)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MIDINoteMap; 