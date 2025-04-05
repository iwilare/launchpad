import React, { useState, useEffect } from 'react';
import { Note, stringToNote, noteToString } from '../types/notes';

interface NoteInputProps {
  data: Note;
  onChange: (parsedNote: Note) => void;
  className?: string;
}

const NoteInput: React.FC<NoteInputProps> = ({ onChange, data, className }) => {
  const [localValue, setLocalValue] = useState<string>(noteToString(data));
  const [isValid, setIsValid] = useState<boolean>(true);

  // Update local value when data changes
  useEffect(() => {
    const noteString = noteToString(data);
    if (noteString !== localValue) {
      setLocalValue(noteString);
      setIsValid(true);
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setLocalValue(newValue);
    
    const parsedNote = stringToNote(newValue);
    const isValidNote = parsedNote !== null;
    setIsValid(isValidNote);
    
    if (isValidNote && parsedNote) {
      onChange(parsedNote);
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      className={`note-input ${!isValid ? 'invalid-input' : ''} ${className}`}
      maxLength={4}
      placeholder="C4"
      title="Enter note name (e.g., C4, C#3)"
    />
  );
};

export default NoteInput; 