// The bottom gutter under the main area grows only while something lives in
// it: the status line or the needs-you pill. Each claims it while it has
// something to show; the theme reads the attribute.
import { useEffect } from "react";

const ATTRIBUTE = "data-polish-gutter";
let claims = 0;

function sync(): void {
  document.documentElement.toggleAttribute(ATTRIBUTE, claims > 0);
}

export function useGutterClaim(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    claims += 1;
    sync();
    return () => {
      claims -= 1;
      sync();
    };
  }, [active]);
}
