function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function base64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    output += alphabet[(triple >> 18) & 63];
    output += alphabet[(triple >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[triple & 63] : "=";
  }
  return output;
}

function wavDataUri(samples: Int16Array, sampleRate = 8000): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, samples[index], true);
  }
  return "data:audio/wav;base64," + base64(new Uint8Array(buffer));
}

function createChime(): string {
  const sampleRate = 8000;
  const duration = 0.72;
  const length = Math.floor(sampleRate * duration);
  const samples = new Int16Array(length);
  const notes = [659.25, 783.99, 1046.5];
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const envelope = Math.max(0, 1 - time / duration);
    let wave = 0;
    for (const frequency of notes) wave += Math.sin(2 * Math.PI * frequency * time);
    samples[index] = Math.round((wave / notes.length) * envelope * 13000);
  }
  return wavDataUri(samples, sampleRate);
}

function createMusicLoop(): string {
  const sampleRate = 8000;
  const secondsPerNote = 0.32;
  const frequencies = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 698.46];
  const length = Math.floor(sampleRate * secondsPerNote * frequencies.length);
  const samples = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const noteIndex = Math.min(frequencies.length - 1, Math.floor(time / secondsPerNote));
    const localTime = time - noteIndex * secondsPerNote;
    const frequency = frequencies[noteIndex];
    const phase = (localTime * frequency) % 1;
    const square = phase < 0.5 ? 1 : -1;
    const envelope = Math.min(1, localTime / 0.025) * Math.min(1, (secondsPerNote - localTime) / 0.05);
    samples[index] = Math.round(square * envelope * 2600);
  }
  return wavDataUri(samples, sampleRate);
}

export const REWARD_CHIME_URI = createChime();
export const BRUSHLINGS_MUSIC_URI = createMusicLoop();