/**
 * Where each creature's mouth is in its 362×362 cell of assets/characters/companions.png,
 * measured from the pixels of the open smile (cell 8 corrected by hand: its flames confuse the
 * measure). Braces are drawn on the upper edge of this box, scaled with the avatar.
 */
export type MouthBox = { x: number; y: number; width: number; height: number };

export const CREATURE_CELL_SIZE = 362;

export const CREATURE_MOUTHS: readonly MouthBox[] = [
  { x: 190, y: 223, width: 31, height: 15 },
  { x: 202, y: 226, width: 32, height: 16 },
  { x: 244, y: 238, width: 32, height: 16 },
  { x: 223, y: 239, width: 31, height: 15 },
  { x: 188, y: 222, width: 33, height: 16 },
  { x: 205, y: 211, width: 31, height: 16 },
  { x: 203, y: 224, width: 30, height: 16 },
  { x: 211, y: 215, width: 32, height: 17 },
  { x: 204, y: 206, width: 32, height: 16 },
  { x: 210, y: 207, width: 31, height: 16 },
  { x: 222, y: 218, width: 31, height: 16 },
];
