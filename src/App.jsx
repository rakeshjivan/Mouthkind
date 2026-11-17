import { useCallback, useEffect, useState } from "react";
import { Icon } from "./components/ui.jsx";
import { Home, latestOf } from "./screens/home.jsx";
import { RiskFlow, RiskResult } from "./screens/risk.jsx";
import { FrequencyPicker, PhFlow, Reminder, SipFlow } from "./screens/extras.jsx";
import { Results, Summary } from "./screens/results.jsx";
import { Me } from "./screens/me.jsx";
import { Backup } from "./screens/backup.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, load, save, wipe } from "./lib/store.js";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "results", label: "My results", icon: "chart" },
  { id: "me", label: "Me", icon: "user" },
];

export default function App() {
  const [profile, setProfileState] = useState(() => ({ ...DEFAULT_PROFILE, ...load("profile", {}) }));
  const [entries, setEntries] = useState(() => { const e = load("entries", []); return Array.isArray(e) ? e : []; });
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...load("prefs", {}) }));
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [afterFreq, setAfterFreq] = useState(false);

  const setProfile = useCallback((p) => { setProfileState(p); save("profile", p); }, []);
  const setPrefs = useCallback((p) => { setPrefsState(p); save("prefs", p); }, []);
  const addEntry = useCallback((x) => setEntries((prev) => { const n = [...prev.filter((e) => e.id !== x.id), x]; save("entries", n); return n; }), []);
  const delEntries = useCallback((ids) => setEntries((prev) => { const n = prev.filter((e) => !ids.includes(e.id)); save("entries", n); return n; }), []);
  const restore = useCallback((data) => {
    const e = Array.isArray(data.entries) ? data.entries : [];
    setEntries(e); save("entries", e);
    if (data.profile) { const p = { ...DEFAULT_PROFILE, ...data.profile }; setProfileState(p); save("profile", p); }
    if (data.prefs) { const p = { ...DEFAULT_PREFS, ...data.prefs }; setPrefsState(p); save("prefs", p); }
  }, []);
  const erase = useCallback(() => { wipe(); setEntries([]); setProfileState(DEFAULT_PROFILE); setPrefsState(DEFAULT_PREFS); setTab("home"); }, []);

  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = () => setSystemDark(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const theme = prefs.theme === "auto" ? (systemDark ? "dark" : "light") : prefs.theme;
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.text = prefs.text; }, [theme, prefs.text]);

  // The first dry mouth check asks how often first, then goes straight into the questions.
  const open = useCallback((s) => {
    if (s === "sip" && !prefs.sipEvery) { setAfterFreq(true); setSheet("freq"); return; }
    setSheet(s);
  }, [prefs.sipEvery]);
  const close = () => setSheet(null);
  const go = (t) => { setTab(t); window.scrollTo(0, 0); };
  const risk = latestOf(entries, "risk");
  const lastSip = [...entries].filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts)[0];

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === "home" && <Home entries={entries} prefs={prefs} open={open} />}
        {tab === "results" && <Results entries={entries} open={open} onDelete={delEntries} onShowRisk={() => setSheet("riskresult")} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === "risk" && <RiskFlow last={risk} onClose={close} onSave={addEntry} onTrack={() => open("sip")} />}
      {sheet === "riskresult" && risk && <RiskResult entry={risk} onClose={close} onTrack={() => open("sip")} onRedo={() => setSheet("risk")} />}
      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={afterFreq} onClose={() => { setAfterFreq(false); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq ? "sip" : null); setAfterFreq(false); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 14} onClose={close} />}
      {sheet === "ph" && <PhFlow onClose={close} onSave={addEntry} />}
      {sheet === "report" && <Summary entries={entries} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
    </div>
  );
}
