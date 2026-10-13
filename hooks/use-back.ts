import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";

/**
 * Back navigation that also works when the screen was opened from a deep link: without history
 * `router.back()` would do nothing, so it falls back to the given route.
 */
export function useBack(fallback: Href = "/"): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }, [fallback, router]);
}
