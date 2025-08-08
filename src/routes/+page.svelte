<script lang="ts">
  import "../static/app.css";

  import { onMount } from "svelte";
  import MIDINoteMap from "$lib/MIDINoteMap.svelte";
  import SoundGenerator from "$lib/SoundGenerator.svelte";
  import DefaultColorsSettings from "$lib/DefaultColorsSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import GridKeyboard from "$lib/GridKeyboard.svelte";
  import IsomorphicKeyboardGenerator from "$lib/IsomorphicKeyboardGenerator.svelte";
  import { applyColorsToMap, colorFromSettings, type NoteState, type ShowSameNote, isActiveNote, isLastNote, increaseNoteMut, decreaseNoteMut, type ColorSettings, type DeviceSettings, type NoteMap,
    DEFAULT_MAPPINGS, noteMapToNiceNoteMapFormat, type LaunchpadColor,
    type Controller, niceNoteMapToNoteMap } from "../types/ui";
  import { emptySoundState, initializeSoundState, pressNoteAudioSynth, releaseNoteAudioSynth, stopEverythingAudioSynth, type SoundState, type SoundSettings, } from "../types/sound";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import type { Note } from "../types/notes";
  import type { Key } from "../types/ui";
  import { noteToString, areSameNote } from "../types/notes";
  import type { SaxKey } from "../types/saxophone";

  let midiAccess: MIDIAccess | null = null;
  let selectedInputDevice: string | null = null;
  let selectedColorDevice: string | null = null;
  let selectedOutputDevice: string | 42 | null = null;
  let inputDevices: MIDIInput[] = [];
  let outputDevices: MIDIOutput[] = [];

  let showSameNotePressed: ShowSameNote = "yes";
  let noteMap: NoteMap = DEFAULT_MAPPINGS;

  let saxNotes: Set<SaxKey> = new SvelteSet();
  let activeNotes: NoteState = new SvelteMap();
  let controller: Controller = new SvelteMap();
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
      console.log("Connecting to color device", deviceId);
      selectedColorDevice = deviceId;
      sendAllKeyboardColors();
      localStorage.setItem("midiColorDevice", selectedColorDevice);
    } else {
      console.error("Requested color device not found", deviceId);
      return "Requested color device not found";
    }
  }

  function connectToOutputDevice(deviceId: string | 42) {
    if(typeof deviceId === 'string') {
      if (!midiAccess) {
        console.error("No midi access to connect to output device");
        return "No midi access to connect to output device";
      }
      const selectedColor = midiAccess.outputs.get(deviceId);
      if (selectedColor) {
        console.log("Connecting to output device", deviceId);
        stopEverythingAudio();
        selectedOutputDevice = deviceId;
        localStorage.setItem("midiOutputDevice", selectedOutputDevice);
      } else {
        console.error("Requested output device not found", deviceId);
        return "Requested output device not found";
      }
    } else {
      selectedOutputDevice = 42;
      console.log("Connecting to default output device");
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

  function controllerChangeColor(key: Note, isPressed: boolean): string | null {
    const mapping = noteMap.get(key);
    if (!mapping) return "No mapping to send color";
    const color = isPressed ? mapping.color.pressed : mapping.color.rest;
    controller.set(key, {
      active: controller.get(key)?.active ?? false,
      color,
    });
    if (selectedColorDevice) {
      return sendMIDIPacket(selectedColorDevice, [0x90, key, color]);
    } else {
      return null;
    }
  }

  function handleNoteColor(key: Note, isPressed: boolean) {
    const map = noteMap.get(key);
    if (!map) return;
    if(map.type == 'note') {
      if (showSameNotePressed === "yes") {
        const wouldBeAffectedNotes = activeNotes.get(map.target) ?? 0;
        const needsChange = isPressed && wouldBeAffectedNotes === 0 || !isPressed && wouldBeAffectedNotes === 1;
        if(needsChange) {
          noteMap.forEach((otherMap, otherKey) => {
            if (otherMap.type === 'note' && map.target == otherMap.target) { return controllerChangeColor(otherKey, isPressed); }
          });
        }
      } else if (showSameNotePressed === "octave") {
        let wouldBeAffectedNotes = 0;
        activeNotes.forEach((n, k) => { if (n > 0 && areSameNote(map.target, k)) { wouldBeAffectedNotes += n; } });
        const needsChange = isPressed && wouldBeAffectedNotes === 0 || !isPressed && wouldBeAffectedNotes === 1;
        if(needsChange) {
          noteMap.forEach((otherMap, otherKey) => {
            if (otherMap.type === 'note' && areSameNote(map.target, otherMap.target)) {
              return controllerChangeColor(otherKey, isPressed);
            }
          });
        }
      } else {
        return controllerChangeColor(key, isPressed);
      }
    } else {
      return controllerChangeColor(key, isPressed);
    }
  }

  function stopEverythingAudio() {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        controller.forEach((_, key) => {
          releaseNoteAudio(key);
        });
      } else {
        stopEverythingAudioSynth(soundState);
      }
    }
  }

  function pressNoteAudio(note: Note, velocity: number = 1.0) {
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

  function playKey(key: Key, velocity: number = 127) {
    const map = noteMap.get(key);
    if (!map) throw "No mapping to play note";
    const k = controller.get(key);
    if (k !== undefined && !k.active) {
      if(map.type == 'note') {
        controller.set(key, { ...k, active: true });
        handleNoteColor(key, true);
        increaseNoteMut(activeNotes, map.target);
        pressNoteAudio(map.target, velocity);
      } else if(map.type == 'pitch') {
        // todo
      } else if(map.type == 'timbre') {
        // todo
      } else if(map.type == 'sax') {
        controller.set(key, { ...k, active: true });
        handleNoteColor(key, true);
        increaseNoteMut(activeNotes, map.saxKey as Note);
        pressNoteAudio(map.saxKey as Note, velocity);
      }
    }
  }

  function stopKey(key: Key) {
    const map = noteMap.get(key);
    if (!map) throw "No mapping to play note";
    const k = controller.get(key);
    if (k !== undefined && k.active)
      if(map.type == 'note'){
        controller.set(key, { ...k, active: false });
        handleNoteColor(key, false);
        decreaseNoteMut(activeNotes, map.target);
        releaseNoteAudio(map.target);
      } else if(map.type == 'sax') {

      }
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
    } else if (messageType === 0xb0) {
      description = `Control Change: Controller: ${note}, Value: ${velocity}, Channel: ${channel + 1}`;
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
    console.log(description);
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
    console.log("Sending all keyboard colors");
    noteMap.forEach((_, note) => {
      controllerChangeColor(note, false);
    });
    sendProgrammerMode();
    sendBrightness();
  }

  function setNoteMap(newNoteMap: NoteMap) {
    stopEverythingAudio();
    noteMap = newNoteMap;
    sendAllKeyboardColors();
    localStorage.setItem("noteMap", noteMapToNiceNoteMapFormat(noteMap));
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
  }

  onMount(() => {
    soundState = initializeSoundState();
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
      const maybeMap = niceNoteMapToNoteMap(savedNoteMap);
      if (typeof maybeMap !== "string") {
        noteMap = maybeMap;
      }
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
    <SoundGenerator
      settings={soundSettings}
      onSettingsChange={setSoundSettings}
      />
    </div>
  {/if}

  <div class="section">
    <h3>Isomorphic Keyboard Layout</h3>
    <IsomorphicKeyboardGenerator
      onUpdateMapping={setNoteMap}
      getNoteColor={(note) => colorFromSettings(colorSettings, note)}
    />
  </div>

  <div class="section">
    <h3>Launchpad Layout</h3>
    <GridKeyboard
      onKeyPress={(k) => playKey(k)}
      onKeyRelease={stopKey}
      {setNoteMap}
      {controller}
      {noteMap}
    />
    <p class="launchpad-layout-tooltip">
      Click note label to edit, click pad edges to play, right-click to open
      color picker
    </p>
  </div>

  <div class="section">
    <h3>Default colors</h3>
    <DefaultColorsSettings
      {colorSettings}
      onColorSettingsChange={(settings) => {
        colorSettings = settings;
        setNoteMap(applyColorsToMap(settings, noteMap));
      }}
    />
  </div>

  <div class="section">
    <div class="mapping-container">
      <h3>Settings</h3>
      <div class="settings-controls">
        <div
          style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 10px;"
        >
          <label>
            <input
              type="radio"
              name="show-same-note-pressed"
              checked={showSameNotePressed === "no"}
              on:change={() => (showSameNotePressed = "no")}
            />
            Light up only the physical button
          </label>
          <label>
            <input
              type="radio"
              name="show-same-note-pressed"
              checked={showSameNotePressed === "yes"}
              on:change={() => (showSameNotePressed = "yes")}
            />
            Light up any occurrence of the note
          </label>
          <label>
            <input
              type="radio"
              name="show-same-note-pressed"
              checked={showSameNotePressed === "octave"}
              on:change={() => (showSameNotePressed = "octave")}
            />
            Light up any occurrence of the note in any octave
          </label>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 200px;">
          <label for="brightness">Button Brightness</label>
          <input
            type="range"
            id="brightness"
            min="0"
            max="127"
            step="1"
            value={deviceSettings.brightness}
            on:input={(e) => setBrightness(parseInt((e.target as HTMLInputElement).value))}
          />
          <span style="margin-left: 8px;">{deviceSettings.brightness}</span>
        </div>
      </div>
      <button
        on:click={sendAllKeyboardColors}
        class="action"
        style="margin-left: 24px;">Sync Keyboard</button
      >
    </div>
  </div>

  <div class="section">
    <MIDINoteMap {noteMap} onUpdateMap={setNoteMap} />
    <button
      style="margin-top: 10px;"
      on:click={() => setNoteMap(DEFAULT_MAPPINGS)}
      class="action">Reset Keyboard Layout</button
    >
  </div>
</div>

<style>
  .App {
    text-align: center;
    min-height: 100vh;
    min-width: 1000px;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition:
      background-color var(--transition-speed),
      color var(--transition-speed);
    width: 45%;
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

  .mapping-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .settings-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 32px;
  }

  .no-devices-detected {
    color: var(--text-color);
    margin-bottom: 0px;
  }
</style>
