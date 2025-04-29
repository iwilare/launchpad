// src/types/webmidi.d.ts
declare namespace WebMidi {
  interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
  }

  interface MIDIInputMap {
    forEach(callback: (input: MIDIInput, key: string) => void): void;
    get(id: string): MIDIInput | undefined;
    has(id: string): boolean;
    keys(): Iterable<string>;
    size: number;
    values(): Iterable<MIDIInput>;
    entries(): Iterable<[string, MIDIInput]>;
  }

  interface MIDIOutputMap {
    forEach(callback: (output: MIDIOutput, key: string) => void): void;
    get(id: string): MIDIOutput | undefined;
    has(id: string): boolean;
    keys(): Iterable<string>;
    size: number;
    values(): Iterable<MIDIOutput>;
    entries(): Iterable<[string, MIDIOutput]>;
  }

  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    sysexEnabled: boolean;
    onstatechange: ((event: MIDIConnectionEvent) => void) | null;
  }

  interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
  }

  interface MIDIMessageEvent extends Event {
    data: Uint8Array;
  }

  interface MIDIPort extends EventTarget {
    id: string;
    manufacturer?: string;
    name?: string;
    type: 'input' | 'output';
    version?: string;
    state: 'connected' | 'disconnected';
    connection: 'open' | 'closed' | 'pending';
    onstatechange: ((event: MIDIConnectionEvent) => void) | null;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
  }

  interface MIDIInput extends MIDIPort {
    type: 'input';
    onmidimessage: ((event: MIDIMessageEvent) => void) | null;
  }

  interface MIDIOutput extends MIDIPort {
    type: 'output';
    send(data: Uint8Array, timestamp?: number): void;
    clear(): void;
  }
}

interface Navigator {
  requestMIDIAccess(options?: WebMidi.MIDIOptions): Promise<WebMidi.MIDIAccess>;
}
