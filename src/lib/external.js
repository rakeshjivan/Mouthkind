// Open a link outside the app. In the Mac app (Tauri) a plain new-tab link
// does nothing, so ask the app to open it in the person's browser instead.
export function openExternal(url) {
  const tauri = typeof window !== "undefined" && window.__TAURI_INTERNALS__;
  if (tauri?.invoke) {
    tauri.invoke("plugin:opener|open_url", { url }).catch(() => window.open(url, "_blank", "noopener"));
    return true;
  }
  return false; // let the browser follow the link normally
}
export const externalClick = (url) => (ev) => { if (openExternal(url)) ev.preventDefault(); };
