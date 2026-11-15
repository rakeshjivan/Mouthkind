import { useCallback, useEffect, useState } from "react";
import { Icon } from "./components/ui.jsx";
import { Onboarding } from "./screens/flows.jsx";
import { HelpNow, Home, sipDue } from "./screens/home.jsx";
import { LogFlow } from "./screens/log.jsx";
import { PhFlow, SipFlow } from "./screens/extras.jsx";
import { Diary } from "./screens/diary.jsx";
import { Relief } from "./screens/relief.jsx";
import { AlertCardSheet, Backup, QuestionsSheet, Report, You } from "./screens/more.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, dayKey, load, save, wipe } from "./lib/store.js";

const TABS = [
  { id: "today", label: "Today", icon: "home" },
  { id: "diary", label: "Diary", icon: "chart" },
  { id: "relief", label: "Relief", icon: "leaf" },
  { id: "you", label: "Me", icon: "user" },
];

const mergeProfile = (p) => ({
  ...DEFAULT_PROFILE, ...p,
  team: { ...DEFAULT_PROFILE.team, ...(p?.team || {}) },
  dentist: { ...DEFAULT_PROFILE.dentist, ...(p?.dentist || {}) },
  treatments: Array.isArray(p?.treatments) ? p.treatments : [],
  chemoDates: Array.isArray(p?.chemoDates) ? p.chemoDates : [],
  asked: Array.isArray(p?.asked) ? p.asked : [],
  ownQuestions: Array.isArray(p?.ownQuestions) ? p.ownQuestions : [],
});

export default function App() {
  const [profile, setProfileState] = useState(() => mergeProfile(load("profile", {})));
  const [entries, setEntries] = useState(() => { const e = load("entries", []); return Array.isArray(e) ? e : []; });
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...load("prefs", {}) }));
  const [tab, setTab] = useState("today");
  const [sheet, setSheet] = useState(null);
  const [focus, setFocus] = useState(null);
  const [care, setCareState] = useState(() => load("care", {}) || {});
  const go = useCallback((t, f = null) => { setTab(t); setFocus(f); window.scrollTo(0, 0); }, []);
  const toggleCare = useCallback((id) => setCareState((prev) => {
    const k = dayKey(Date.now()), cur = prev[k] || [];
    const n = { ...prev, [k]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    save("care", n); return n;
  }), []);

  const setProfile = useCallback((p) => { setProfileState(p); save("profile", p); }, []);
  const setPrefs = useCallback((p) => { setPrefsState(p); save("prefs", p); }, []);
  // Saving an entry with an id that already exists replaces it (editing today's log).
  const addEntry = useCallback((x) => setEntries((prev) => { const n = [...prev.filter((e) => e.id !== x.id), x]; save("entries", n); return n; }), []);
  const delEntries = useCallback((ids) => setEntries((prev) => { const n = prev.filter((e) => !ids.includes(e.id)); save("entries", n); return n; }), []);
  const restore = useCallback((data) => {
    const e = Array.isArray(data.entries) ? data.entries : [];
    setEntries(e); save("entries", e);
    const p = mergeProfile(data.profile || {}); setProfileState(p); save("profile", p);
    if (data.care) { setCareState(data.care); save("care", data.care); }
  }, []);
  const erase = useCallback(() => {
    wipe(); setCareState({}); setEntries([]); setProfileState(mergeProfile({})); setPrefsState(DEFAULT_PREFS); setTab("today");
  }, []);

  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = () => setSystemDark(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const theme = prefs.theme === "auto" ? (systemDark ? "dark" : "light") : prefs.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.text = prefs.text;
  }, [theme, prefs.text]);

  const todayLog = [...entries].filter((e) => e.kind === "daily" && dayKey(e.ts) === dayKey(Date.now())).sort((a, b) => b.ts - a.ts)[0];

  if (!profile.onboarded) return <Onboarding profile={profile} onDone={setProfile} />;

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === "today" && <Home profile={profile} entries={entries} care={care} onCare={toggleCare} open={setSheet} go={go} />}
        {tab === "diary" && <Diary profile={profile} entries={entries} open={setSheet} onDelete={delEntries} />}
        {tab === "relief" && <Relief key={focus || "r"} profile={profile} entries={entries} focus={focus} />}
        {tab === "you" && <You profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={setSheet} onErase={erase} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === "log" && <LogFlow profile={profile} today={todayLog} onClose={() => setSheet(null)} onSave={addEntry} />}
      {sheet === "sip" && <SipFlow previous={sipDue(entries).last} onClose={() => setSheet(null)} onSave={addEntry} />}
      {sheet === "ph" && <PhFlow onClose={() => setSheet(null)} onSave={addEntry} />}
      {sheet === "helpnow" && <HelpNow profile={profile} onClose={() => setSheet(null)} />}
      {sheet === "alertcard" && <AlertCardSheet profile={profile} onClose={() => setSheet(null)} />}
      {sheet === "questions" && <QuestionsSheet profile={profile} setProfile={setProfile} onClose={() => setSheet(null)} />}
      {sheet === "report" && <Report profile={profile} entries={entries} onClose={() => setSheet(null)} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, care }} onRestore={restore} onClose={() => setSheet(null)} />}
    </div>
  );
}
