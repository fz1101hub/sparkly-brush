import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";

let nextSessionTag = 0;

// Keeping the screen awake is optional: denied permissions must not stop a session.
export function useSessionKeepAwake() {
  useEffect(() => {
    const tag = `brushlings-session-${++nextSessionTag}`;
    let disposed = false;
    let activated = false;
    const release = () => {
      void deactivateKeepAwake(tag).catch(() => {});
    };

    void activateKeepAwakeAsync(tag).then(() => {
      activated = true;
      if (disposed) release();
    }).catch(() => {});

    return () => {
      disposed = true;
      if (activated) release();
    };
  }, []);
}
