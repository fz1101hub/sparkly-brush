export const SONICARE = {
  manufacturerId: 477,
  advertisedNames: ["Sonicare4Kids", "Sonicare for Kids", "Sonicare"],
  services: {
    primary: "477ea600-a260-11e4-ae37-0002a5d50001",
    routine: "477ea600-a260-11e4-ae37-0002a5d50002",
    kidsSession: "477ea600-a260-11e4-ae37-0002a5d50003",
    battery: "0000180f-0000-1000-8000-00805f9b34fb",
    deviceInfo: "0000180a-0000-1000-8000-00805f9b34fb",
  },
  characteristics: {
    handleState: "477ea600-a260-11e4-ae37-0002a5d54010",
    motorRuntime: "477ea600-a260-11e4-ae37-0002a5d54040",
    handleTime: "477ea600-a260-11e4-ae37-0002a5d54050",
    sessionId: "477ea600-a260-11e4-ae37-0002a5d54070",
    brushingMode: "477ea600-a260-11e4-ae37-0002a5d54080",
    brushingTime: "477ea600-a260-11e4-ae37-0002a5d54090",
    routineLength: "477ea600-a260-11e4-ae37-0002a5d54091",
    quadPacer: "477ea600-a260-11e4-ae37-0002a5d540a0",
    intensity: "477ea600-a260-11e4-ae37-0002a5d540b0",
    latestSessionId: "477ea600-a260-11e4-ae37-0002a5d540d0",
    sessionCount: "477ea600-a260-11e4-ae37-0002a5d540d2",
    activeSessionId: "477ea600-a260-11e4-ae37-0002a5d540e0",
    sessionData: "477ea600-a260-11e4-ae37-0002a5d54100",
    batteryLevel: "00002a19-0000-1000-8000-00805f9b34fb",
    modelNumber: "00002a24-0000-1000-8000-00805f9b34fb",
    firmwareRevision: "00002a26-0000-1000-8000-00805f9b34fb",
  },
} as const;

export const HANDLE_STATE_LABELS: Record<number, string> = {
  0: "spento",
  1: "in attesa",
  2: "spazzolamento",
  3: "in carica",
  4: "spegnimento",
  6: "verifica",
  7: "background",
};

export const intensityFromByte = (value?: number) => {
  if (value === 0) return "bassa" as const;
  if (value === 1) return "media" as const;
  if (value === 2) return "alta" as const;
  return "sconosciuta" as const;
};
