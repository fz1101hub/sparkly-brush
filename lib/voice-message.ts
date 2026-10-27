/**
 * The parent's voice message (voce 61): a short encouragement recorded on this phone, heard by the
 * child at the end of a complete brushing. The audio is kept in the child's extras (so it is part
 * of the complete and family backups, never sent anywhere else); about 80 kB for 20 seconds.
 */
export const VOICE_MAX_SECONDS = 20;
/** Base64 of 20 s of mono AAC at 32 kbit/s is about 110 000 characters: twice that is the cap. */
export const MAX_VOICE_BASE64 = 240_000;
export const VOICE_MIME_TYPES = ["audio/mp4", "audio/webm"] as const;
export type VoiceMimeType = (typeof VOICE_MIME_TYPES)[number];

export type VoiceMessage = {
  audio: string;
  mimeType: VoiceMimeType;
  seconds: number;
  recordedAt: number;
  /** Heard at the end of every complete brushing, not only the first one after the recording. */
  repeat: boolean;
  heardAt: number | null;
};

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function normalizeVoiceMessage(raw: unknown): VoiceMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<VoiceMessage>;
  if (typeof value.audio !== "string" || value.audio.length === 0 || value.audio.length > MAX_VOICE_BASE64 || !BASE64.test(value.audio)) return null;
  if (!VOICE_MIME_TYPES.includes(value.mimeType as VoiceMimeType)) return null;
  if (typeof value.recordedAt !== "number" || !Number.isFinite(value.recordedAt)) return null;
  const seconds = typeof value.seconds === "number" && Number.isFinite(value.seconds) ? value.seconds : 0;
  return {
    audio: value.audio,
    mimeType: value.mimeType as VoiceMimeType,
    seconds: Math.min(VOICE_MAX_SECONDS, Math.max(0, Math.round(seconds))),
    recordedAt: value.recordedAt,
    repeat: value.repeat === true,
    heardAt: typeof value.heardAt === "number" && Number.isFinite(value.heardAt) ? value.heardAt : null,
  };
}

/** The reward offers the message when it was never heard, or every time when the parent asked so. */
export function voiceMessageWaiting(message: VoiceMessage | null): boolean {
  return message !== null && (message.repeat || message.heardAt === null);
}

export function voiceDataUri(message: VoiceMessage): string {
  return `data:${message.mimeType};base64,${message.audio}`;
}
