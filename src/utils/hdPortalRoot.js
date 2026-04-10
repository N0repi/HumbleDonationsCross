/**
 * Portal mount inside _app’s font wrapper so UI inherits Plus Jakarta Sans.
 * Falls back to document.body if the root is missing (e.g. tests).
 */
export function getHdPortalContainer() {
  if (typeof document === "undefined") return null;
  return document.getElementById("hd-portal-root") ?? document.body;
}
