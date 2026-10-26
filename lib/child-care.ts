export type ChildCareSettings = {
  brushlingName: string;
  targetSeconds: 60 | 90 | 120;
  vacationMode: boolean;
  brushTogether: boolean;
  calmMode: boolean;
  readableText: boolean;
  babysitterInstructions: string;
  brushHeadChangedOn: string;
};

export const DEFAULT_CHILD_CARE: ChildCareSettings = {
  brushlingName: "", targetSeconds: 120, vacationMode: false, brushTogether: false,
  calmMode: false, readableText: false, babysitterInstructions: "", brushHeadChangedOn: "",
};

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Allowlisted fields only, also used when reading a portable backup. */
export function normalizeChildCare(value: unknown): ChildCareSettings {
  const raw = value && typeof value === "object" ? value as Partial<ChildCareSettings> : {};
  const clean = (text: unknown, max: number) => typeof text === "string"
    ? [...text.replace(/[\u0000-\u001f\u007f]/g, " ").trim()].slice(0, max).join("") : "";
  return {
    brushlingName: clean(raw.brushlingName, 24),
    targetSeconds: raw.targetSeconds === 60 || raw.targetSeconds === 90 ? raw.targetSeconds : 120,
    vacationMode: raw.vacationMode === true,
    brushTogether: raw.brushTogether === true,
    calmMode: raw.calmMode === true,
    readableText: raw.readableText === true,
    babysitterInstructions: clean(raw.babysitterInstructions, 600),
    brushHeadChangedOn: typeof raw.brushHeadChangedOn === "string" && isCalendarDate(raw.brushHeadChangedOn)
      ? raw.brushHeadChangedOn : "",
  };
}

/** Three calendar months, clamped to the last day of the destination month. */
export function brushHeadDueDate(changedOn: string): Date | null {
  if (!isCalendarDate(changedOn)) return null;
  const [year, month, day] = changedOn.split("-").map(Number);
  const lastDay = new Date(year, month + 3, 0).getDate();
  return new Date(year, month + 2, Math.min(day, lastDay));
}

export function brushingPhase(elapsed: number, target: number) {
  const safeTarget = Math.max(1, target);
  const position = Math.min(11, Math.floor(Math.max(0, elapsed) / safeTarget * 12));
  return { zone: Math.floor(position / 3), surface: position % 3 };
}
