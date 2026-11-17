import { useState } from "react";
import { Sheet } from "../components/ui.jsx";
import { downloadText, makeBackup, readBackup } from "../lib/store.js";

// Save or restore everything as a file, optionally locked with a passphrase.
export function Backup({ payload, onRestore, onClose }) {
  const [mode, setMode] = useState("save");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const run = async (fn) => { setMsg(null); try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message }); } };
  return (
    <Sheet title="Backup" onClose={onClose}>
      <div className="seg full">
        <button className={mode === "save" ? "on" : ""} onClick={() => { setMode("save"); setMsg(null); }}>Save a backup</button>
        <button className={mode === "restore" ? "on" : ""} onClick={() => { setMode("restore"); setMsg(null); }}>Restore</button>
      </div>
      <p className="lede" style={{ marginTop: 16 }}>Your records live only on this device. A backup file means a new phone or computer doesn't mean starting again.</p>
      <label className="field"><span>Passphrase {mode === "save" ? "(recommended)" : "(if you set one)"}</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" /></label>
      <p className="note">The file is locked on this device with AES-256. Nobody — including us — can open it without the passphrase, so keep it somewhere safe.</p>
      {mode === "save" ? (
        <button className="btn primary big" onClick={() => run(async () => {
          downloadText(`mouthkind-backup-${dayKey(Date.now())}.json`, await makeBackup(payload, pass || null));
          setMsg({ ok: true, text: pass ? "Locked backup saved." : "Backup saved. It isn't locked, so store it somewhere private." });
        })}>Save backup file</button>
      ) : (
        <label className="btn ghost big file-btn">Choose a backup file
          <input type="file" accept=".json,application/json" hidden onChange={(ev) => ev.target.files[0] && run(async () => {
            const data = await readBackup(await ev.target.files[0].text(), pass || null);
            onRestore(data); setMsg({ ok: true, text: "Restored." });
          })} />
        </label>
      )}
      {msg && <p className={msg.ok ? "ok-msg" : "err-msg"} role="status">{msg.text}</p>}
    </Sheet>
  );
}
