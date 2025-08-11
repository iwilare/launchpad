<script lang="ts">
  import "../static/app.css";

  import { onMount } from "svelte";
  import MIDINoteMap from "$lib/JsonEditor.svelte";
  import SoundGenerator from "$lib/SoundGenerator.svelte";
  import DefaultColorsSettings from "$lib/DefaultColorsSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import GridKeyboard from "$lib/GridKeyboard.svelte";
  import LayoutGenerator from "$lib/LayoutGenerator.svelte";
  import LayoutManager from "$lib/LayoutManager.svelte";
  import { colorFromSettings, type NoteState, type ShowSameNote, increaseNoteMut, decreaseNoteMut, type ColorSettings, type DeviceSettings, type NoteMap,
    niceify,
    type Controller,
    niceNoteMap,
    forEachNotePressed,
    emptyController} from "../types/ui";
  import { emptySoundState, initializeSoundState, pressNoteAudioSynth, releaseNoteAudioSynth, stopEverythingAudioSynth, updateActiveNoteVolumes, type SoundState, type SoundSettings, } from "../types/sound";
  import { SvelteMap } from "svelte/reactivity";
  import type { Note } from "../types/notes";
  import type { Key } from "../types/ui";
  import { noteToString, areSameNote, noteReprToNote } from "../types/notes";
  import { NORMAL_KEYS, OCTAVE_KEYS, ORDERED_COMBOS, saxPressedKeysToNote, type SaxKey } from "../types/saxophone";
  import { DEFAULT_MAPPINGS, applyColorsToMap, emptyMapping } from "../types/layouts";

  let midiAccess: MIDIAccess | null = null;
  let selectedInputDevice: string | null = null;
  let selectedColorDevice: string | null = null;
  let selectedOutputDevice: string | 42 | null = null;
  let inputDevices: MIDIInput[] = [];
  let outputDevices: MIDIOutput[] = [];

  let showSameNotePressed: ShowSameNote = "yes";
  let noteMap: NoteMap = DEFAULT_MAPPINGS;

  let saxNotes: Map<SaxKey, number> = new SvelteMap();
  let currentSaxNote: number | null = null;
  let currentSaxVelocity: number = 127;
  // Time window (ms) during which sax note changes are ignored to avoid transition artifacts
  let saxNoteIgnoreMs: number = 35;
  // Sax play mode: 'press' requires Play key to sound; 'combo' auto-sounds on fingering.
  let saxMode: 'press' | 'combo' = 'press';
  // Pending scheduled change while Play is held
  let pendingSax: { timer: number, target: number } | null = null;

  let activeNotes: NoteState = new SvelteMap();
  let controller: Controller = emptyController();
  let soundState: SoundState = emptySoundState();

  let deviceSettings: DeviceSettings = {
    brightness: 127,
  };

  let theme: "light" | "dark" = "dark";
  let colorSettings: ColorSettings = {
    singleColor: true,
    whiteRest: 0x00,
    whitePressed: 0x25,
    blackRest: 0x03,
    blackPressed: 0x24,
  };

  let soundSettings: SoundSettings = {
    volume: 0.5,
    waveform: "sine",
    attackTime: 10,
    releaseTime: 100,
  };

  /* MIDI logic */
  function connectToInputDevice(deviceId: string) {
    if (!midiAccess) {
      console.error("No midi access to connect to input device");
      return "No midi access to connect to input device";
    }
    const selectedInput = midiAccess.inputs.get(deviceId);
    if (selectedInput) {
      console.log("Connecting to input device", deviceId);
      stopEverythingAudio();
      midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      selectedInput.onmidimessage = onMIDIMessage;
      selectedInputDevice = deviceId;
      localStorage.setItem("midiInputDevice", selectedInputDevice);
    } else {
      console.error("Requested input device not found", deviceId);
      return "Requested input device not found";
    }
  }

  function connectToColorDevice(deviceId: string) {
    if (!midiAccess) {
      console.error("No midi access to connect to color device");
      return "No midi access to connect to color device";
    }
    const selectedColor = midiAccess.outputs.get(deviceId);
    if (selectedColor) {
      selectedColorDevice = deviceId;
      sendAllKeyboardColors();
      localStorage.setItem("midiColorDevice", selectedColorDevice);
    } else {
      return "Requested color device not found";
    }
  }

  function connectToOutputDevice(deviceId: string | 42) {
    if(typeof deviceId === 'string') {
      if (!midiAccess) {
        return "No midi access to connect to output device";
      }
      const selectedColor = midiAccess.outputs.get(deviceId);
      if (selectedColor) {
        stopEverythingAudio();
        selectedOutputDevice = deviceId;
        localStorage.setItem("midiOutputDevice", selectedOutputDevice);
      } else {
        return "Requested output device not found";
      }
    } else {
      selectedOutputDevice = 42;
      localStorage.setItem("midiOutputDevice", 'default');
      return;
    }
  }

  async function initializeMIDIAccess() {
    if (navigator.requestMIDIAccess) {
      midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      if (!midiAccess) {
        return "Failed to initialize MIDI access";
      }
      function onMIDIStateChange() {
        if (!midiAccess) return;

        console.log("MIDI state change");

        inputDevices = [...midiAccess.inputs.values()].reverse();
        outputDevices = [...midiAccess.outputs.values()].reverse();

        if (selectedInputDevice === null && inputDevices.length > 0) {
          if (localStorage.getItem("midiInputDevice")) {
            connectToInputDevice(localStorage.getItem("midiInputDevice") as string);
          } else {
            connectToInputDevice(inputDevices[inputDevices.length - 1].id);
          }
        }
        if (selectedColorDevice === null && outputDevices.length > 0) {
          if (localStorage.getItem("midiColorDevice")) {
            connectToColorDevice(localStorage.getItem("midiColorDevice") as string);
          } else {
            connectToColorDevice(outputDevices[outputDevices.length - 1].id);
          }
        }
        if (selectedOutputDevice === null) {
          const output = localStorage.getItem("midiOutputDevice")
          if (output) {
            connectToOutputDevice(output === 'default' ? 42 : output);
          }
        }
      }
      onMIDIStateChange();
      midiAccess.addEventListener("statechange", onMIDIStateChange);
    } else {
      return "MIDI access not supported";
    }
  }

  function handleThemeChange(newTheme: "light" | "dark") {
    theme = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  }

  function sendMIDIPacket(deviceId: string, message: number[]): string | null {
    if (!midiAccess) return "No midi access";
    const output = midiAccess.outputs.get(deviceId);
    if (!output) return "No selected device when trying to send packet";
    try {
      output.send(new Uint8Array(message));
      return null;
    } catch (error) {
      return "Could not send MIDI packet";
    }
  }

  function controllerInteract(key: Note, value: boolean): string | null {
    const mapping = noteMap.get(key);
    if (!mapping) return "No mapping to send color";
    const color = value ? mapping.color.pressed : mapping.color.rest;
    controller.set(key, { active: value, color });
    if (selectedColorDevice) {
      return sendMIDIPacket(selectedColorDevice, [0x90, key, color]);
    } else {
      return null;
    }
  }

  function handleNoteColor(key: Note, value: boolean) {
    const map = noteMap.get(key);
    if(map !== undefined && map.mapping.type == 'note') {
      const m = map.mapping;
      if (showSameNotePressed === "yes") {
        const wouldBeAffectedNotes = activeNotes.get(m.target) ?? 0;
        const needsChange = value && wouldBeAffectedNotes === 0 || !value && wouldBeAffectedNotes === 1;
        if(needsChange) {
          noteMap.forEach((otherMap, otherKey) => {
            if (otherMap.mapping.type === 'note' && m.target == otherMap.mapping.target) {
              return controllerInteract(otherKey, value);
            }
          });
        }
      } else if (showSameNotePressed === "octave") {
        let wouldBeAffectedNotes = 0;
        activeNotes.forEach((n, k) => { if (n > 0 && areSameNote(m.target, k)) { wouldBeAffectedNotes += n; } });
        const needsChange = value && wouldBeAffectedNotes === 0 || !value && wouldBeAffectedNotes === 1;
        if(needsChange) {
          noteMap.forEach((otherMap, otherKey) => {
            if (otherMap.mapping.type === 'note' && areSameNote(m.target, otherMap.mapping.target)) {
              return controllerInteract(otherKey, value);
            }
          });
        }
      } else {
        return controllerInteract(key, value);
      }
    } else {
      return controllerInteract(key, value);
    }
  }

  function stopEverythingAudio() {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        forEachNotePressed(activeNotes, releaseNoteAudio)
      } else {
        stopEverythingAudioSynth(soundState);
      }
    }
  }

  function pressNoteAudio(note: Note, velocity: number = 127) {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        sendMIDIPacket(selectedOutputDevice, [0x90, note, velocity]);
      } else {
        pressNoteAudioSynth(soundState, soundSettings, note, velocity);
      }
    }
  }

  function releaseNoteAudio(note: Note) {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        sendMIDIPacket(selectedOutputDevice, [0x80, note, 0]);
      } else {
        releaseNoteAudioSynth(soundState, soundSettings, note);
      }
    }
  }

  function clearPendingSaxChange() {
    if (pendingSax !== null) {
      clearTimeout(pendingSax.timer);
      pendingSax = null;
    }
  }

  function scheduleSaxNoteChange(target: number) {
    if (// duplicate
        pendingSax !== null && pendingSax.target === target ||
        // already playing the target note
        currentSaxNote === target)
      return;
    clearPendingSaxChange();
    pendingSax = {
      target,
      timer: setTimeout(() => {
          const notCleared = pendingSax !== null;
          const playCondition = saxMode === 'press' ? saxNotes.get('Play') ?? 0 > 0 : true
          const stillPlayingNote = saxPressedKeysToNote(saxNotes) === target
          const notPlayingItYet = currentSaxNote !== target
          console.log("Condition", notCleared, playCondition, stillPlayingNote, notPlayingItYet)
          if (notCleared && playCondition && stillPlayingNote && notPlayingItYet) {
            if (currentSaxNote !== null) {
              releaseNoteAudio(currentSaxNote);
            }
            currentSaxNote = target;
            pressNoteAudio(target, currentSaxVelocity);
          }
          pendingSax = null;
      }, saxNoteIgnoreMs) as number
    }
  }

  function saxStopEverything() {
    clearPendingSaxChange();
    if (currentSaxNote !== null) { releaseNoteAudio(currentSaxNote); }
    currentSaxNote = null;
  }
  function saxPlay(nextNote: Key) {
    console.log("Sax play", nextNote)
    clearPendingSaxChange();
    if (currentSaxNote === null || nextNote !== currentSaxNote) {
      if (saxNoteIgnoreMs === 0) {
        if (currentSaxNote !== null) {
          releaseNoteAudio(currentSaxNote);
        }
        currentSaxNote = nextNote;
        pressNoteAudio(nextNote, currentSaxVelocity);
      } else {
        console.log("Scheduling", nextNote)
        scheduleSaxNoteChange(nextNote);
      }
    }
  }

  function saxSyncCombo() {
    const play: number = saxNotes.get('Play') ?? 0;
    const anyOctave = OCTAVE_KEYS.some(k => (saxNotes.get(k) ?? 0) > 0);
    const anyNormal = NORMAL_KEYS.some(k => (saxNotes.get(k) ?? 0) > 0);
    const fingeredNote = saxPressedKeysToNote(saxNotes);

    if(!anyNormal) {
      if(anyOctave || play > 0) {
        saxPlay(fingeredNote);
      } else {
        saxStopEverything();
      }
    } else {
      saxPlay(fingeredNote)
    }
  }

  function saxSyncPress() {
    console.log("Syncing saxophone in press mode", saxNotes);
    if ((saxNotes.get('Play') ?? 0) <= 0) {
      console.log("Stop everything", saxNotes);
      saxStopEverything()
    } else {
      console.log("Play", saxNotes);
      saxPlay(saxPressedKeysToNote(saxNotes))
    }
  }

  function saxSync() {
    if (saxMode === 'combo') {
      saxSyncCombo()
    } else {
      saxSyncPress()
    }
  }

  function playKey(key: Key, velocity: number = 127): string | null {
    const map = noteMap.get(key);
    if (!map) return "No mapping to play note";
    const k = controller.get(key);
    if (k === undefined || !k.active) {
      const m = map.mapping;
      if(m.type == 'note') {
        controllerInteract(key, true);
        handleNoteColor(key, true);
        increaseNoteMut(activeNotes, m.target);
        pressNoteAudio(m.target, velocity);
      } else if(m.type == 'pitch') {
        // todo
      } else if(m.type == 'timbre') {
        // todo
      } else if(m.type == 'sax') {
        controllerInteract(key, true);
        handleNoteColor(key, true);
        increaseNoteMut(saxNotes, m.key);
        saxSync();
      }
      return null
    } else
      return "Key already pressed";
  }

  function stopKey(key: Key): string | null {
    const map = noteMap.get(key);
    if (!map) return "No mapping to play note";
    const k = controller.get(key);
    if (k !== undefined && k.active) {
      const m = map.mapping;
      if(m.type == 'note'){
        controllerInteract(key, false);
        handleNoteColor(key, false);
        decreaseNoteMut(activeNotes, m.target);
        releaseNoteAudio(m.target);
      } else if(m.type == 'sax') {
        controllerInteract(key, false);
        handleNoteColor(key, false);
        decreaseNoteMut(saxNotes, m.key);
        saxSync();
      }
      return null
    } else
      return "Key already pressed";
  }

  function onMIDIMessage(event: MIDIMessageEvent) {
    if (!event.data) {
      return;
    }

    const [status, note, velocity] = Array.from(event.data);

    let description = "Unknown MIDI message";

    const channel = status & 0x0f;
    const messageType = status & 0xf0;

    if (messageType === 0x90 && velocity > 0) {
      playKey(note, velocity);
      description = `Note On:  ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (
      messageType === 0x80 ||
      (messageType === 0x90 && velocity === 0)
    ) {
      stopKey(note);
      description = `Note Off: ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xb0 && velocity > 0) {
      description = `Control Change On: Controller: ${note}, Value: ${velocity}, Channel: ${channel + 1}`;
      playKey(note, velocity);
    } else if (messageType === 0xb0 && velocity === 0) {
      description = `Control Change Off: Controller: ${note}, Value: ${velocity}, Channel: ${channel + 1}`;
      stopKey(note);
    } else if (messageType === 0xc0) {
      description = `Program Change: Program: ${note}, Channel: ${channel + 1}`;
    } else if (messageType === 0xe0) {
      const bendValue = ((velocity << 7) | note) - 8192;
      description = `Pitch Bend: Value: ${bendValue}, Channel: ${channel + 1}`;
    } else if (messageType === 0xa0) {
      description = `Aftertouch: Note: ${note}, Pressure: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xd0) {
      description = `Channel Pressure: Pressure: ${note}, Channel: ${channel + 1}`;
    } else {
      console.error(
        "Unrecognized MIDI message type:",
        `0x${messageType.toString(16).toUpperCase()}`,
      );
    }
  }

  function sendProgrammerMode() {
    if (selectedColorDevice) {
      return sendMIDIPacket(selectedColorDevice, [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x00, 0x7F, 0xF7])
    } else {
      return "No selected device";
    }
  }

  function sendBrightness() {
    if (selectedColorDevice) {
      return sendMIDIPacket(selectedColorDevice, [0xF0, 0x00, 0x20, 0x29, 0x02, 0x0D, 0x08, deviceSettings.brightness, 0xF7]);
    } else {
      return "No selected color device";
    }
  }

  function sendAllKeyboardColors() {
    console.log("Sending all keyboard colors", controller, noteMap);
    controller.keys().forEach(k => {
      controllerInteract(k, false);
    });
    sendProgrammerMode();
    sendBrightness();
  }

  function setNoteMap(newNoteMap: NoteMap) {
    stopEverythingAudio();
    noteMap = newNoteMap;
    sendAllKeyboardColors();
    localStorage.setItem("noteMap", niceify(noteMap));
  }

  // Function to update brightness, persist, and send MIDI
  function setBrightness(brightness: number) : string | null {
    deviceSettings = { ...deviceSettings, brightness };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("sound_brightness", brightness.toString());
    }
    return sendBrightness();
  }

  function setSoundSettings(settings: SoundSettings) {
    soundSettings = settings;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("sound_attackTime", settings.attackTime.toString());
      localStorage.setItem("sound_releaseTime", settings.releaseTime.toString());
      localStorage.setItem("sound_volume", settings.volume.toString());
      localStorage.setItem("sound_waveform", settings.waveform);
    }
  updateActiveNoteVolumes(soundState, soundSettings);
  }

  onMount(() => {
    soundState = initializeSoundState();
  updateActiveNoteVolumes(soundState, soundSettings);
  });

  onMount(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    theme = savedTheme
      ? savedTheme
      : new Date().getHours() >= 18 || new Date().getHours() < 6
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  });

  onMount(() => {
    const savedNoteMap = localStorage.getItem("noteMap");
    if (savedNoteMap) {
      const maybeMap = niceNoteMap(savedNoteMap);
      if (typeof maybeMap !== "string") {
        noteMap = maybeMap;
      }
    }
    // Restore color settings if present
    const cs = localStorage.getItem('colorSettings');
    if (cs) {
      try {
        const parsed = JSON.parse(cs);
        if (parsed && typeof parsed === 'object') {
          const maybe: any = parsed;
          if (typeof maybe.singleColor === 'boolean'
              && typeof maybe.whiteRest === 'number'
              && typeof maybe.whitePressed === 'number'
              && typeof maybe.blackRest === 'number'
              && typeof maybe.blackPressed === 'number') {
            colorSettings = maybe;
          }
        }
      } catch { /* ignore */ }
    }
  });

  onMount(() => {
    if (typeof localStorage !== "undefined") {
      const brightness = localStorage.getItem("sound_brightness");
      deviceSettings = {
        ...deviceSettings,
        brightness: typeof brightness === 'string' ? parseInt(brightness) : deviceSettings.brightness,
      };
    }
  });

  onMount(() => {
    if (typeof localStorage !== "undefined") {
      const attack = localStorage.getItem("sound_attackTime");
      const release = localStorage.getItem("sound_releaseTime");
      const volume = localStorage.getItem("sound_volume");
      const waveform = localStorage.getItem("sound_waveform");
      soundSettings = {
        ...soundSettings,
        attackTime: typeof attack === 'string' ? parseInt(attack) : soundSettings.attackTime,
        releaseTime: typeof release === 'string' ? parseInt(release) : soundSettings.releaseTime,
        volume: typeof volume === 'string' ? parseFloat(volume) : soundSettings.volume,
        waveform: typeof waveform === 'string' ? waveform as OscillatorType : soundSettings.waveform,
      };
    }
  });

  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const ignore = localStorage.getItem('saxNoteIgnoreMs');
      if (typeof ignore === 'string') {
        const parsed = parseInt(ignore);
        if(!isNaN(parsed) && parsed >= 0) saxNoteIgnoreMs = parsed;
      }
  const savedMode = localStorage.getItem('saxMode');
  if (savedMode === 'combo' || savedMode === 'press') saxMode = savedMode;
    }
  });

  // Initialize MIDI access and devices
  onMount(() => {
    initializeMIDIAccess();
  });
</script>

<div class="App" data-theme={theme}>
  <header class="App-header">
    <h1>MIDI Controller</h1>
    <ThemeToggle onThemeChange={handleThemeChange} />
  </header>
  <div class="section">
    <h3>MIDI Devices</h3>
    <div class="device-selector">
      <div class="device-group">
        <label for="input-device">Input Device:</label>
        <select
          id="input-device"
          value={selectedInputDevice}
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) { connectToInputDevice(target.value); }
          }}
        >
          {#each inputDevices as device}
            <option value={device.id}>{device.name}</option>
          {/each}
        </select>
      </div>
      <div class="device-group">
        <label for="output-device">Color Device:</label>
        <select
          id="output-device"
          value={selectedColorDevice}
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) { connectToColorDevice(target.value); }
          }}
        >
          {#each outputDevices as device}
            <option value={device.id}>{device.name}</option>
          {/each}
        </select>
      </div>
      <div class="device-group">
        <label for="output-device">Output Device:</label>
        <select
          id="output-device"
          value={typeof selectedOutputDevice === 'string' ? selectedOutputDevice : 'default'}
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) { connectToOutputDevice(target.value === 'default' ? 42 : target.value); }
          }}
        >
          <option value="default">Built-in synth</option>
          {#each outputDevices as device}
            <option value={device.id}>{device.name}</option>
          {/each}
        </select>
      </div>
      <div class="device-group">
        <label for="brightness">Button Brightness</label>
        <div class="device-brightness">
          <input
            type="range"
            id="brightness"
            min="0"
            max="127"
            step="1"
            value={deviceSettings.brightness}
            on:input={(e) => setBrightness(parseInt((e.target as HTMLInputElement).value))}
          />
          <span class="brightness-value">{deviceSettings.brightness}</span>
        </div>
      </div>
      <div class="device-controls">
        <button on:click={() => initializeMIDIAccess()} class="action"
          >Refresh access</button
        >
      </div>
    </div>

    {#if inputDevices.length === 0 && outputDevices.length === 0}
      <p class="no-devices-detected">No MIDI devices detected. Connect a device and click Refresh.</p>
    {/if}
  </div>

  {#if typeof selectedOutputDevice !== 'string'}
  <div class="section">
    <h3>Sound Generator</h3>
    <SoundGenerator settings={soundSettings} onSettingsChange={setSoundSettings} />
    </div>
  {/if}

  <div class="section">
    <h3>Layouts</h3>
    <LayoutGenerator onUpdateMapping={setNoteMap} getNoteColor={m => colorFromSettings(colorSettings, m)} />

      <div style="margin-top: 10px; text-align: left;">
      <LayoutManager {noteMap} onRestoreMap={setNoteMap} />
    </div>
  </div>

  <div class="section">
    <h3>Launchpad Layout</h3>
    <GridKeyboard onKeyPress={(k) => playKey(k)} onKeyRelease={stopKey} {setNoteMap} {controller} {noteMap} />
    <p class="launchpad-layout-tooltip">
      Click note label to edit, click pad edges to play, right-click to open
      color picker
    </p>
  </div>

  <div class="section">
    <h3>Settings</h3>
    <div class="settings-grid">
      <div class="settings-card">
        <h4>Keyboard Colors</h4>
        <DefaultColorsSettings {colorSettings} onColorSettingsChange={(settings) => {
          colorSettings = settings;
          // Persist color settings
          try { localStorage.setItem('colorSettings', JSON.stringify(colorSettings)); } catch {}
          setNoteMap(applyColorsToMap(settings, noteMap));
        }} />
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button on:click={sendAllKeyboardColors} class="action small">Sync Keyboard</button>
          <button on:click={() => { setNoteMap(emptyMapping()); }} class="action small" title="Reset mappings to defaults">Reset All Mappings</button>
        </div>
      </div>
      <div class="settings-card">
        <h4>Keyboard Display</h4>
        <label>
          <input type="radio" name="show-same-note-pressed" checked={showSameNotePressed === "no"}
            on:change={() => (showSameNotePressed = "no")} />
          Light up only the physical button
        </label>
        <label>
          <input type="radio" name="show-same-note-pressed" checked={showSameNotePressed === "yes"}
            on:change={() => (showSameNotePressed = "yes")} />
          Light up any occurrence of the note
        </label>
        <label>
          <input type="radio" name="show-same-note-pressed" checked={showSameNotePressed === "octave"}
            on:change={() => (showSameNotePressed = "octave")} />
          Light up any occurrence of the note in any octave
        </label>
      </div>
      <div class="settings-card">
        <h4>Saxophone</h4>
        <div class="radio-group">
          <label>
            <input type="radio" name="sax-mode" value="combo" checked={saxMode==='combo'} on:change={() => { saxMode='combo'; localStorage.setItem('saxMode', saxMode); saxSync(); }} />
            Autoplay
          </label>
          <label>
            <input type="radio" name="sax-mode" value="press" checked={saxMode==='press'} on:change={() => { saxMode='press'; localStorage.setItem('saxMode', saxMode); saxSync(); }} />
            Only on 'Play' key
          </label>
        </div>
        <div class="sax-ignore">
          <label for="sax-ignore-ms" class="inline-label">Transition ignore (ms)</label>
          <input id="sax-ignore-ms" type="number" min="0" max="1000" step="5" bind:value={saxNoteIgnoreMs}
            on:change={(e) => {
              const v = parseInt((e.target as HTMLInputElement).value);
              if(!isNaN(v) && v >= 0) {
                saxNoteIgnoreMs = v;
                localStorage.setItem('saxNoteIgnoreMs', saxNoteIgnoreMs.toString());
                if (saxNoteIgnoreMs === 0 && pendingSax !== null) {
                  clearPendingSaxChange();
                  const play = saxNotes.get('Play') ?? 0;
                  if (play > 0 || saxMode === 'combo') {
                    const resolved = saxPressedKeysToNote(saxNotes);
                    if (currentSaxNote !== resolved) {
                      if (currentSaxNote !== null) releaseNoteAudio(currentSaxNote);
                      currentSaxNote = resolved;
                      pressNoteAudio(currentSaxNote, currentSaxVelocity);
                    }
                  }
                }
              }
            }} />
          <span class="help-text">Ignore rapid finger transitions</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <MIDINoteMap {noteMap} onUpdateMap={setNoteMap} />
    <button
      style="margin-top: 10px;" on:click={() => setNoteMap(applyColorsToMap(colorSettings, DEFAULT_MAPPINGS))}
      class="action">Reset Keyboard Layout</button
    >
  </div>
</div>

<style>
  .App {
    text-align: center;
    min-height: 100vh;
    min-width: 80vh;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition:
      background-color var(--transition-speed),
      color var(--transition-speed);
    width: 50%;
  }

  .App-header {
    background-color: var(--card-bg);
    padding: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    min-height: 60px;
    border-radius: 0px 0px 5px 5px;
    border: 1px solid var(--border-color);
    border-top: none;
    margin-bottom: 20px;
  }

  .section {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    background-color: var(--section-bg);
    color: var(--text-color);
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--text-color);
    transition: color var(--transition-speed);
  }

  h3 {
    margin-top: 0;
    margin-bottom: 15px;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 16px;
    width: 100%;
  }
  .settings-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  .settings-card h4 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; }
  .settings-card label { font-size: 0.78rem; line-height: 1.2rem; display: flex; gap: 6px; align-items: center; }
  .settings-card input[type=number] { width: 90px; }
  .radio-group { display: flex; flex-direction: column; gap: 4px; }
  .sax-ignore { display:flex; flex-direction:column; gap:4px; width:100%; }
  .sax-ignore .inline-label { font-weight:500; font-size:0.75rem; }
  .help-text { font-size:0.65rem; opacity:0.75; }
  .action.small { align-self:flex-start; margin-top:4px; }

  .device-selector {
    display: flex;
    flex-direction: row;
    gap: 20px;
    margin-bottom: 15px;
    align-items: flex-end; /* This aligns all children at the bottom */
  }

  .device-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .device-brightness {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brightness-value {
    min-width: 32px;
    text-align: right;
  }

  .launchpad-layout-tooltip {
    font-size: 12px;
    color: var(--launchpad-layout-tooltip);
    margin-top: 5px;
  }

  @media (max-width: 768px) {
    .device-selector {
      flex-direction: column;
    }

    .App-header h1 {
      font-size: 1.5rem;
    }

    .App {
      width: 100%;
      padding: 0 10px;
    }
  }


  .no-devices-detected {
    color: var(--text-color);
    margin-bottom: 0px;
  }
</style>
