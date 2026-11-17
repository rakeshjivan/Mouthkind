import { useCallback, useEffect, useState } from "react";
import { Icon } from "./components/ui.jsx";
import { Home, latestOf, phReadings, sipReadings } from "./screens/home.jsx";
import { Care } from "./screens/care.jsx";
import { careContext } from "./data/care.js";
import { phPattern } from "./data/ph.js";
import { scoreRisk } from "./data/risk.js";
import { RiskFlow, RiskResult } from "./screens/risk.jsx";
import { FrequencyPicker, PhFlow, Reminder, SipFlow } from "./screens/extras.jsx";
import { Results, Summary } from "./screens/results.jsx";
import { Me } from "./screens/me.jsx";
import { Backup } from "./screens/backup.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, load, save, wipe } from "./lib/store.js";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "tracker", label: "Tracker", icon: "chart" },
  { id: "advice", label: "Advice", icon: "leaf" },
  { id: "me", label: "Me", icon: "user" },
];

export default function App() {
  const [profile, setProfileState] = useState(() => ({ ...DEFAULT_PROFILE, ...load("profile", {}) }));
  const [entries, setEntries] = useState(() => { const e = load("entries", []); return Array.isArray(e) ? e : []; });
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...load("prefs", {}) }));
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [afterFreq, setAfterFreq] = useState(null);
  const [focus, setFocus] = useState(null);

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
    if ((s === "sip" || s === "ph") && !prefs.sipEvery) { setAfterFreq(s); setSheet("freq"); return; }
    setSheet(s);
  }, [prefs.sipEvery]);
  const close = () => setSheet(null);
  const go = (t, f = null) => { setSheet(null); setTab(t); setFocus(f); window.scrollTo(0, 0); };
  const risk = latestOf(entries, "risk");
  const riskR = risk && scoreRisk(risk.answers);
  const careCtx = careContext({ factors: riskR?.factors, sip: sipReadings(entries).at(-1)?.sip ?? null, ph: phPattern(phReadings(entries)).level, risk: riskR?.band.id || null });
  const lastSip = [...entries].filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts)[0];

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === "home" && <Home profile={profile} entries={entries} prefs={prefs} careCtx={careCtx} open={open} go={go} />}
        {tab === "advice" && <Care key={focus || "c"} ctx={careCtx} focus={focus} />}
        {tab === "tracker" && <Results entries={entries} open={open} onDelete={delEntries} onShowRisk={() => setSheet("riskresult")} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === "risk" && <RiskFlow last={risk} onClose={close} onSave={addEntry} onCare={() => go("advice")} />}
      {sheet === "riskresult" && risk && <RiskResult entry={risk} onClose={close} onCare={() => go("advice")} onRedo={() => setSheet("risk")} />}
      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={!!afterFreq} onClose={() => { setAfterFreq(null); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq); setAfterFreq(null); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 14} onClose={close} />}
      {sheet === "ph" && <PhFlow readings={phReadings(entries)} onClose={close} onSave={addEntry} onCare={() => go("advice", "protect")} />}
      {sheet === "report" && <Summary entries={entries} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
    </div>
  );
}
