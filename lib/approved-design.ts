import type { ImageSourcePropType } from "react-native";
import type { AppThemeId } from "@/lib/app-themes";

export type ArtworkRegion = {
  sheet: "ac" | "def" | "i" | "creatures";
  rect: readonly [number, number, number, number];
};
export const DESIGN_SHEETS: Record<
  ArtworkRegion["sheet"],
  { source: ImageSourcePropType; width: number; height: number }
> = {
  ac: {
    source: require("@/assets/approved/a-c.png"),
    width: 1536,
    height: 1024,
  },
  def: {
    source: require("@/assets/approved/d-e-f.png"),
    width: 1774,
    height: 887,
  },
  i: { source: require("@/assets/approved/i.png"), width: 1536, height: 1024 },
  creatures: {
    source: require("@/assets/characters/companions.png"),
    width: 1448,
    height: 1086,
  },
};

type ApprovedDesign = {
  letter: "A" | "C" | "D" | "E" | "F" | "I";
  home: ArtworkRegion;
  session: ArtworkRegion;
  scene: ArtworkRegion;
  logo: ArtworkRegion;
  mouth: ArtworkRegion;
  buddy: ArtworkRegion;
  ink: string;
  base: string;
  panel: string;
  button: readonly [string, string];
  buttonText: string;
  timer: string;
  timerTrack: string;
  segments: number;
  headline: readonly string[];
};

// Pixel coordinates refer to the approved boards, kept unchanged in assets/approved.
// Only illustration/wordmark regions are painted as images; values and controls are live.
export const APPROVED_DESIGN: Record<AppThemeId, ApprovedDesign> = {
  adventure: {
    letter: "A",
    home: { sheet: "ac", rect: [33, 250, 231, 636] },
    session: { sheet: "ac", rect: [285, 250, 220, 636] },
    scene: { sheet: "ac", rect: [33, 335, 231, 272] },
    logo: { sheet: "ac", rect: [46, 255, 132, 34] },
    mouth: { sheet: "ac", rect: [300, 417, 190, 162] },
    buddy: { sheet: "ac", rect: [294, 691, 204, 116] },
    ink: "#111B51",
    base: "#FFF7E5",
    panel: "#FFFDF2",
    button: ["#FF9273", "#F3634F"],
    buttonText: "#FFFFFF",
    timer: "#5DC8BE",
    timerTrack: "#C8EAE1",
    segments: 4,
    headline: ["Pronto", "per una nuova", "avventura?"],
  },
  arcade: {
    letter: "C",
    home: { sheet: "ac", rect: [1033, 250, 233, 636] },
    session: { sheet: "ac", rect: [1291, 250, 222, 636] },
    scene: { sheet: "ac", rect: [1033, 470, 233, 217] },
    logo: { sheet: "ac", rect: [1044, 254, 139, 34] },
    mouth: { sheet: "ac", rect: [1300, 422, 199, 171] },
    buddy: { sheet: "ac", rect: [1296, 695, 211, 122] },
    ink: "#FFFDF2",
    base: "#11133F",
    panel: "#15183F",
    button: ["#E1FF49", "#C5F312"],
    buttonText: "#12184A",
    timer: "#D0F924",
    timerTrack: "#33375D",
    segments: 1,
    headline: ["Pronto", "per la missione?"],
  },
  cosmos: {
    letter: "D",
    home: { sheet: "def", rect: [32, 185, 261, 643] },
    session: { sheet: "def", rect: [328, 185, 256, 643] },
    scene: { sheet: "def", rect: [32, 270, 261, 279] },
    logo: { sheet: "def", rect: [41, 184, 163, 48] },
    mouth: { sheet: "def", rect: [375, 398, 162, 140] },
    buddy: { sheet: "def", rect: [328, 605, 256, 144] },
    ink: "#FFF8E7",
    base: "#17183E",
    panel: "#3D3165",
    button: ["#FFC297", "#FF9B72"],
    buttonText: "#0D1A4A",
    timer: "#FFB590",
    timerTrack: "#63456F",
    segments: 4,
    headline: ["Un sorriso", "stellare"],
  },
  garden: {
    letter: "E",
    home: { sheet: "def", rect: [619, 185, 256, 643] },
    session: { sheet: "def", rect: [907, 185, 251, 643] },
    scene: { sheet: "def", rect: [619, 270, 256, 276] },
    logo: { sheet: "def", rect: [627, 184, 164, 49] },
    mouth: { sheet: "def", rect: [956, 399, 160, 137] },
    buddy: { sheet: "def", rect: [907, 605, 251, 143] },
    ink: "#073F29",
    base: "#FFF5D8",
    panel: "#FFFCEE",
    button: ["#278655", "#00532C"],
    buttonText: "#FFFFFF",
    timer: "#83B53F",
    timerTrack: "#C8D99D",
    segments: 4,
    headline: ["Coltiva", "il tuo sorriso"],
  },
  bubbles: {
    letter: "F",
    home: { sheet: "def", rect: [1193, 185, 261, 643] },
    session: { sheet: "def", rect: [1488, 185, 256, 643] },
    scene: { sheet: "def", rect: [1193, 270, 261, 278] },
    logo: { sheet: "def", rect: [1201, 184, 167, 49] },
    mouth: { sheet: "def", rect: [1535, 398, 161, 139] },
    buddy: { sheet: "def", rect: [1488, 605, 256, 145] },
    ink: "#073B69",
    base: "#ECFAFF",
    panel: "#F8FEFF",
    button: ["#FF947B", "#F36351"],
    buttonText: "#10234C",
    timer: "#25CBDD",
    timerTrack: "#B9E7ED",
    segments: 4,
    headline: ["Pronto a fare", "le bolle?"],
  },
  underwater: {
    letter: "I",
    home: { sheet: "i", rect: [1035, 182, 230, 690] },
    session: { sheet: "i", rect: [1288, 186, 228, 684] },
    scene: { sheet: "i", rect: [1035, 272, 230, 311] },
    logo: { sheet: "i", rect: [1043, 185, 136, 45] },
    mouth: { sheet: "i", rect: [1319, 435, 181, 155] },
    buddy: { sheet: "i", rect: [1288, 660, 228, 146] },
    ink: "#FFFBE8",
    base: "#034D62",
    panel: "#034254",
    button: ["#9AF3DD", "#4CD5BE"],
    buttonText: "#092740",
    timer: "#86EDD6",
    timerTrack: "#24758B",
    segments: 12,
    headline: ["Un tuffo", "nel sorriso"],
  },
};

const TAB_ICONS: Record<
  AppThemeId,
  { x: readonly number[]; y: number; size: number }
> = {
  adventure: { x: [52, 111, 168, 219], y: 845, size: 29 },
  arcade: { x: [1054, 1112, 1168, 1221], y: 846, size: 29 },
  cosmos: { x: [51, 115, 179, 243], y: 775, size: 27 },
  garden: { x: [638, 702, 766, 830], y: 775, size: 27 },
  bubbles: { x: [1212, 1277, 1343, 1408], y: 775, size: 27 },
  underwater: { x: [1051, 1108, 1166, 1223], y: 822, size: 29 },
};
export function getTabArtwork(theme: AppThemeId, index: number): ArtworkRegion {
  const icons = TAB_ICONS[theme];
  return {
    sheet: APPROVED_DESIGN[theme].home.sheet,
    rect: [icons.x[index], icons.y, icons.size, icons.size],
  };
}
