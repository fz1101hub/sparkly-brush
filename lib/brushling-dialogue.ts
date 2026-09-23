import type { BrushlingId } from "@/lib/brushlings";

export type DialogueContext = "idle" | "morning" | "evening" | "brushing" | "reward";

const LINES: Record<BrushlingId, Record<DialogueContext, string[]>> = {
  bloopi: {
    idle: ["Secondo me oggi troviamo qualcosa di luccicante.", "Le bolle migliori arrivano dopo una bella spazzolata."],
    morning: ["Splash! Facciamo brillare il sorriso prima dell’avventura.", "Buongiorno! Ho già preparato le bolle."],
    evening: ["Una spazzolata e poi sogni di mare.", "Puliamo tutto prima che arrivi la luna."],
    brushing: ["Vai così! Una zona alla volta.", "Splash splash, stai facendo benissimo!"],
    reward: ["Lo sapevo! C’era un premio nascosto.", "Ogni sorriso pulito fa crescere la nostra isola."],
  },
  spriggo: {
    idle: ["Ogni piccola abitudine fa crescere qualcosa di grande.", "Oggi possiamo far spuntare un nuovo germoglio."],
    morning: ["Buongiorno! Facciamo crescere il sorriso.", "Foglie su, spazzolino pronto!"],
    evening: ["Le radici riposano meglio con i denti puliti.", "Ultima missione e poi nanna nel giardino."],
    brushing: ["Costante e delicato, proprio così.", "Stai coltivando un super sorriso!"],
    reward: ["Che crescita! Sono fiero di noi.", "Un altro passo e il giardino diventa più grande."],
  },
  flarello: {
    idle: ["Accendiamo una nuova missione?", "Ho energia da vendere. Tu hai lo spazzolino?"],
    morning: ["Scintille del mattino! Si parte!", "Sorriso acceso prima di uscire."],
    evening: ["Ultima fiammata della giornata!", "Facciamo brillare tutto e poi riposo."],
    brushing: ["Forza! Mancano solo poche scintille.", "Fiamma costante, sorriso potente!"],
    reward: ["Boom! Ricompensa conquistata.", "Che fiammata! Abbiamo spaccato."],
  },
  voltuff: {
    idle: ["Bzzzt! Ho captato una missione vicina.", "Batterie cariche. Sorriso pronto?"],
    morning: ["Carica mattutina al massimo!", "Zap! Due minuti e partiamo."],
    evening: ["Ultima ricarica prima della notte.", "Scarichiamo le ultime briciole dai denti."],
    brushing: ["Bzzzt! Ritmo perfetto.", "Energia stabile: continua così!"],
    reward: ["ZAP! Premio sbloccato.", "Segnale fortissimo: missione riuscita!"],
  },
  moonbit: {
    idle: ["Anche le avventure tranquille fanno crescere.", "La luna dice che oggi possiamo fare un piccolo passo."],
    morning: ["Un buongiorno morbido e un sorriso pulito.", "Piano piano, iniziamo bene la giornata."],
    evening: ["La luna è pronta. Facciamo l’ultima missione.", "Denti puliti, pensieri leggeri, buonanotte."],
    brushing: ["Respira e continua, stai andando benissimo.", "Calma e costanza: manca poco."],
    reward: ["Una piccola luce nuova nella notte.", "Che bello: abbiamo guadagnato un altro ricordo."],
  },
};

export function getBrushlingDialogue(
  id: BrushlingId,
  context: DialogueContext,
  completedSessions: number,
  level: number,
  timestamp: number = Date.now(),
): string {
  const lines = LINES[id][context];
  const date = new Date(timestamp);
  const seed = date.getDate() + date.getMonth() * 31 + completedSessions * 3 + level;
  return lines[Math.abs(seed) % lines.length];
}

export function inferDialogueContext(isActive: boolean, timestamp: number = Date.now()): DialogueContext {
  if (isActive) return "brushing";
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 18) return "evening";
  return "idle";
}