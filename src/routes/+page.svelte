<script lang="ts">
  import "../static/app.css";

  import { onMount } from "svelte";
  import MIDINoteMap from "$lib/JsonEditor.svelte";
  import SoundGenerator from "$lib/SoundGenerator.svelte";
  import Transposer from "$lib/Transposer.svelte";
  import DefaultColorsSettings from "$lib/DefaultColorsSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import GridKeyboard from "$lib/GridKeyboard.svelte";
  import LayoutGenerator from "$lib/LayoutGenerator.svelte";
  import LayoutManager from "$lib/LayoutManager.svelte";
  import { colorFromSettings, type NoteState, type ShowSameNote, increaseNoteMut, decreaseNoteMut, type ColorSettings, type DeviceSettings, type NoteMap as KeyMap,
    niceify,
    type Controller,
    niceNoteMap,
    forEachNotePressed,
    emptyController} from "../types/ui";
  import { emptySoundState, initializeSoundState, pressNoteAudioSynth, releaseNoteAudioSynth, stopEverythingAudioSynth, updateActiveNoteVolumes, setPitchBendSynth, type SoundState, type SoundSettings, } from "../types/sound";
  import { SvelteMap } from "svelte/reactivity";
  import type { Note } from "../types/notes";
  import type { Key } from "../types/ui";
  import { DEFAULT_TRANSPOSER, type TransposerSettings } from "../types/ui";
  import { noteToString, areSameNote } from "../types/notes";
  import { NORMAL_KEYS, OCTAVE_KEYS, saxPressedKeysToNote, type SaxKey } from "../types/saxophone";
  import { DEFAULT_COLOR, DEFAULT_MAPPINGS, applyColorsToMap, emptyMapping, generateSaxophoneLayoutMap } from "../types/layouts";

  let midiAccess: MIDIAccess | null = null;
  let selectedInputDevice: string | null = null;
  let selectedColorDevice: string | null = null;
  let selectedOutputDevice: string | 42 | null = null;
  let inputDevices: MIDIInput[] = [];
  let outputDevices: MIDIOutput[] = [];

  let showSameNotePressed: ShowSameNote = "yes";
  let keyMap: KeyMap = DEFAULT_MAPPINGS;

  let saxNotes: Map<SaxKey, number> = new SvelteMap();
  let currentSaxNote: number | null = null;
  let currentSaxVelocity: number = 127;
  // Time window (ms) during which sax note changes are ignored to avoid transition artifacts
  let saxNoteIgnoreMs: number = 10;
  // Sax play mode: 'press' requires Play key to sound; 'combo' auto-sounds on fingering.
  let saxMode: 'press' | 'combo' = 'press';
  // Pending scheduled change while Play is held
  let pendingSax: { timer: number, target: number } | null = null;

  let activeNotes: NoteState = new SvelteMap();
  let controller: Controller = emptyController();
  let soundState: SoundState = emptySoundState();
  let transposer: TransposerSettings = DEFAULT_TRANSPOSER;
  // Play mode and editor now live inside GridKeyboard

  let deviceSettings: DeviceSettings = {
    brightness: 127,
  };

  let theme: "light" | "dark" = "dark";
  let colorSettings: ColorSettings = {
    singleColor: false,
    whiteRest: 0x03,
    whitePressed: 0x76,
    blackRest: 0x25,
    blackPressed: 0x4E,
  };

  let soundSettings: SoundSettings = {
    volume: 0.5,
    waveform: "sine",
    attackTime: 10,
    releaseTime: 100,
  };

  function setTransposerSettings(s: TransposerSettings) {
    const prev = transposer;
    transposer = s;
    try {
      localStorage.setItem("transpose_note", String(s.transposeNote));
      localStorage.setItem("pitch_bend14", String(s.pitchBend));
    } catch {}
    // Send/update pitch bend immediately
    applyPitchBend(s.pitchBend);
    // If transpose changed, stop all currently sounding notes to avoid hangs
    if (!prev || prev.transposeNote !== s.transposeNote) {
      stopEverythingAudio();
    }
  }

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
        // ensure pitch bend state is applied to the newly selected device
        applyPitchBend(transposer.pitchBend);
      } else {
        return "Requested output device not found";
      }
    } else {
      selectedOutputDevice = 42;
      localStorage.setItem("midiOutputDevice", 'default');
      // apply bend to built-in synth
      applyPitchBend(transposer.pitchBend);
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
    const mapping = keyMap.get(key);
    const color = mapping === undefined ? DEFAULT_COLOR : value ? mapping.color.pressed : mapping.color.rest;
    controller.set(key, { active: value, color });
    if (selectedColorDevice) {
      return sendMIDIPacket(selectedColorDevice, [0x90, key, color]);
    } else {
      return null;
    }
  }

  function handleKeyColor(key: Key, value: boolean) {
    const map = keyMap.get(key);
    if(map === undefined) {
      controllerInteract(key, value)
    } else if(map.mapping.type == 'note') {
      const m = map.mapping;
      if (showSameNotePressed === "yes") {
        const wouldBeAffectedNotes = activeNotes.get(m.target) ?? 0;
        const needsChange = value && wouldBeAffectedNotes === 0 || !value && wouldBeAffectedNotes === 1;
        if(needsChange) {
          keyMap.forEach((otherMap, otherKey) => {
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
          keyMap.forEach((otherMap, otherKey) => {
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
        forEachNotePressed(activeNotes, releaseNoteAudio);
        // Clear local active notes state to stay in sync
        activeNotes.clear();
      } else {
        stopEverythingAudioSynth(soundState);
      }
    }
  }

  function transposeOut(note: Note): Note {
    // Offset computed as difference from center C4=60
    const offset = transposer.transposeNote - 60;
    const n = note + offset;
    return Math.max(0, Math.min(127, n));
  }

  function pressNoteAudio(note: Note, velocity: number = 127) {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        const tn = transposeOut(note);
        sendMIDIPacket(selectedOutputDevice, [0x90, tn, velocity]);
      } else {
        const tn = transposeOut(note);
        pressNoteAudioSynth(soundState, soundSettings, tn, velocity);
      }
    }
  }

  function releaseNoteAudio(note: Note) {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        const tn = transposeOut(note);
        sendMIDIPacket(selectedOutputDevice, [0x80, tn, 0]);
      } else {
        const tn = transposeOut(note);
        releaseNoteAudioSynth(soundState, soundSettings, tn);
      }
    }
  }

  function applyPitchBend(bend14: number) {
    if (!selectedOutputDevice) return;
    if (typeof selectedOutputDevice === 'string') {
      // MIDI pitch bend message: 0xE0, LSB, MSB
      const v = Math.max(0, Math.min(16383, Math.floor(bend14)));
      const lsb = v & 0x7F;
      const msb = (v >> 7) & 0x7F;
      sendMIDIPacket(selectedOutputDevice, [0xE0, lsb, msb]);
    } else {
      setPitchBendSynth(soundState, bend14);
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
    const map = keyMap.get(key);
    if (!map) return "No mapping to play note";
    const k = controller.get(key);
    if (k === undefined || !k.active) {
      const m = map.mapping;
      if(m.type == 'note') {
        controllerInteract(key, true);
        handleKeyColor(key, true);
        increaseNoteMut(activeNotes, m.target);
        pressNoteAudio(m.target, velocity);
      } else if(m.type == 'pitch') {
        // todo
      } else if(m.type == 'timbre') {
        // todo
      } else if(m.type == 'sax') {
        controllerInteract(key, true);
        handleKeyColor(key, true);
        increaseNoteMut(saxNotes, m.key);
        saxSync();
      }
      return null
    } else
      return "Key already pressed";
  }

  function stopKey(key: Key): string | null {
    const map = keyMap.get(key);
    if (!map) return "No mapping to play note";
    const k = controller.get(key);
    if (k !== undefined && k.active) {
      const m = map.mapping;
      if(m.type == 'note'){
        controllerInteract(key, false);
        handleKeyColor(key, false);
        decreaseNoteMut(activeNotes, m.target);
        releaseNoteAudio(m.target);
      } else if(m.type == 'sax') {
        controllerInteract(key, false);
        handleKeyColor(key, false);
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
    console.log("Sending all keyboard colors", controller, keyMap);
    controller.keys().forEach(k => {
      controllerInteract(k, false);
    });
    sendProgrammerMode();
    sendBrightness();
  }

  function setNoteMap(newNoteMap: KeyMap) {
    stopEverythingAudio();
    keyMap = newNoteMap;
    sendAllKeyboardColors();
    localStorage.setItem("noteMap", niceify(keyMap));
  }

  // Editor-related logic moved to GridKeyboard

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
        keyMap = maybeMap;
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
      const tnote = localStorage.getItem("transpose_note");
      const pb = localStorage.getItem("pitch_bend14");
      transposer = {
        transposeNote: typeof tnote === 'string' ? Math.max(0, Math.min(127, parseInt(tnote))) : transposer.transposeNote,
        pitchBend: typeof pb === 'string' ? Math.max(0, Math.min(16383, parseInt(pb))) : transposer.pitchBend,
      };
      // Ensure current output reflects saved bend
      applyPitchBend(transposer.pitchBend);
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
  <button on:click={() => initializeMIDIAccess()} class="btn"
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
    <h3>Transposer & Pitch Bend</h3>
  <Transposer settings={transposer} onTransposerChange={setTransposerSettings} />
  </div>


  <div class="section">
    <h3>Launchpad Layout</h3>
    <GridKeyboard onKeyPress={(k) => playKey(k)} onKeyRelease={stopKey} {controller} noteMap={keyMap} onUpdateMapping={setNoteMap} />
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
          setNoteMap(applyColorsToMap(settings, keyMap));
        }} />
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button on:click={sendAllKeyboardColors} class="btn" style="width:100%">Sync Keyboard</button>
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
          <label for="sax-ignore-ms" class="inline-label">Ignore rapid finger transitions (ms)</label>
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
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Layouts</h3>
  <LayoutGenerator onUpdateMapping={setNoteMap} getNoteColor={m => colorFromSettings(colorSettings, m)} />
    <div class="layouts-flex-column">
      <div class="layouts-tools">
        <div class="tool-card">
          <LayoutManager noteMap={keyMap} onRestoreMap={setNoteMap} />
        </div>
        <div class="tool-card">
          <MIDINoteMap noteMap={keyMap} onUpdateMap={setNoteMap} />
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button on:click={() => setNoteMap(applyColorsToMap(colorSettings, DEFAULT_MAPPINGS))} class="btn">Reset mappings to default</button>
        <button on:click={() => { setNoteMap(emptyMapping()); }} class="btn" title="Clear all mappings">Clear all mappings</button>
      </div>
    </div>
  </div>
</div>

<style>
  /* Layout containers */
  .App { width:100%; max-width:1000px; margin:0 auto 3rem; padding:0 1rem 2rem; display:flex; flex-direction:column; gap:1.5rem; }
  .App-header { background:var(--card-bg); padding:1rem; display:flex; align-items:center; justify-content:space-between; border:1px solid var(--border-color); border-radius:0 0 8px 8px; }

  /* Sections */
  .section { background:var(--section-bg); border:1px solid var(--border-color); border-radius:8px; padding:1rem 1rem 1.15rem; display:flex; flex-direction:column; gap:1rem; max-width:100%; }

  /* Forms and controls */
  label { font-size:0.8rem; font-weight:500; margin:0; display:flex; align-items:center; gap:.4rem; }
  input, select { font-size:0.8rem; }
  input[type=number] { width:90px; }

  /* Device selector layout */
  .device-selector { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); align-items:end; }
  .device-group { display:flex; flex-direction:column; gap:.4rem; }
  .device-brightness { display:flex; align-items:center; gap:.75rem; }
  #brightness { flex:1; }
  .brightness-value { font-size:0.7rem; min-width:28px; text-align:right; opacity:.75; }
  .device-controls { display:flex; gap:.6rem; flex-wrap:wrap; }

  /* Settings cards */
  .settings-grid { display:grid; gap:1rem; grid-template-columns:1fr; width:100%; }
  .settings-card { background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:.85rem .95rem .95rem; display:flex; flex-direction:column; gap:.55rem; }
  .radio-group { display:flex; flex-direction:column; gap:.35rem; }
  .sax-ignore { display:flex; flex-direction:column; gap:.45rem; }
  .sax-ignore .inline-label { font-size:0.7rem; }
  /* Grid keyboard now owns play mode/editor */
  /* .help-text intentionally removed (unused) */

  /* Launchpad hints */
  /* .launchpad-layout-tooltip intentionally removed (unused) */

  /* Layouts section */
  .layouts-flex-column { display:flex; flex-direction:column; gap:1rem; }
  .layouts-tools { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
  .tool-card { background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:.85rem; }

  /* JSON editor tweaks */
  :global(.json-editor textarea) { max-width:100%; box-sizing:border-box; font-size:0.8rem; line-height:1.2rem; }
  @media (max-width:600px) { :global(.json-editor textarea) { height:220px; } }

  /* Color settings table (shared component) */
  :global(.color-settings-table) { font-size:0.7rem; }
  :global(.color-settings-table th), :global(.color-settings-table td) { padding:6px 6px; }

  /* Range inputs */
  input[type=range] { width:100%; }
  .edit-popover { position:absolute; z-index:1000; background:var(--card-bg); border:1px solid var(--border-color); border-radius:6px; padding:.6rem; box-shadow:0 4px 12px var(--shadow-color); display:flex; flex-direction:column; gap:.4rem; }
  .edit-row { display:flex; align-items:center; gap:.5rem; }
  .edit-actions { display:flex; align-items:center; justify-content:space-between; gap:.6rem; margin-top:.4rem; }

  /* Accessibility */
  :focus-visible { outline:2px solid var(--button-bg); outline-offset:2px; }

  .no-devices-detected { font-size:0.75rem; opacity:.8; margin:0; }

  /* Medium screens */
  @media (min-width: 640px) { .settings-grid { grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); } }
</style>
