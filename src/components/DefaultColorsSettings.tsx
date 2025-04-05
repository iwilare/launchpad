import React, { useState, useEffect } from 'react';
import { NoteMapping, LaunchpadColor, NoteMap, Note } from '../types/notes';
import { launchpadColorToHexString } from '../types/colors';
import { noteToString, isBlackKey, stringToNote } from '../types/notes';
import ColorButton from './ColorButton';

interface Props {
    colorSettings: ColorSettings;
    onColorSettingsChange: (settings: ColorSettings) => void;
    onPropagateColors: () => void;
}
  
interface ColorSettings {
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
}

const DefaultColorsSettings: React.FC<Props> = ({ colorSettings, onColorSettingsChange, onPropagateColors }) => {
    return (
        <div className="color-settings">
            <table className="color-settings-table">
                <tbody>
                    <tr>
                        <td>
                            <label>White Key Rest:</label>
                            <ColorButton
                                value={colorSettings.whiteRest}
                                onChange={(value) => onColorSettingsChange({ 
                                    ...colorSettings,
                                    whiteRest: value
                                })}
                            />
                        </td>
                        <td>
                            <label>White Key Pressed:</label>
                            <ColorButton
                                value={colorSettings.whitePressed}
                                onChange={(value) => onColorSettingsChange({ 
                                    ...colorSettings,
                                    whitePressed: value
                                })}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label>Black Key Rest:</label>
                            <ColorButton
                                value={colorSettings.blackRest}
                                onChange={(value) => onColorSettingsChange({
                                    ...colorSettings,
                                    blackRest: value
                                })}
                            />
                        </td>
                        <td>
                            <label>Black Key Pressed:</label>
                            <ColorButton
                                value={colorSettings.blackPressed}
                                onChange={(value) => onColorSettingsChange({
                                    ...colorSettings,
                                    blackPressed: value
                                })}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
            <button onClick={onPropagateColors}>Apply Colors</button>
        </div>
  );
}

export default DefaultColorsSettings;