import { useCallback, useEffect, useState } from "react";
import { Icon } from "./components/ui.jsx";
import { CheckIn, Onboarding, SipCheck, WeeklyCheck } from "./screens/flows.jsx";
import { ResultSheet, Today } from "./screens/today.jsx";
import { AlertCardSheet, Backup, Learn, Products, QuestionsSheet, Report, Trends, You } from "./screens/more.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, load, save, wipe } from "./lib/store.js";

const TABS = [
  { id: "today", label: "Today", icon: "home" },
  { id: "trends", label: "Trends", icon: "chart" },
  { id: "products", label: "Products", icon: "bag" },
  { id: "learn", label: "Learn", icon: "book" },
  { id: "you", label: "You", icon: "user" },
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
  const [result, setResult] = useState(null);

  const setProfile = useCallback((p) => { setProfileState(p); save("profile", p); }, []);
  const setPrefs = useCallback((p) => { setPrefsState(p); save("prefs", p); }, []);
  const addEntry = useCallback((x) => setEntries((prev) => { const n = [...prev, x]; save("entries", n); return n; }), []);
  const delEntries = useCallback((ids) => setEntries((prev) => { const n = prev.filter((e) => !ids.includes(e.id)); save("entries", n); return n; }), []);
  const restore = useCallback((data) => {
    const e = Array.isArray(data.entries) ? data.entries : [];
    setEntries(e); save("entries", e);
    const p = mergeProfile(data.profile || {}); setProfileState(p); save("profile", p);
  }, []);
  const erase = useCallback(() => {
    wipe(); setEntries([]); setProfileState(mergeProfile({})); setPrefsState(DEFAULT_PREFS); setTab("today");
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

  if (!profile.onboarded) return <Onboarding profile={profile} onDone={setProfile} />;

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === "today" && <Today profile={profile} entries={entries} open={setSheet} go={setTab} />}
        {tab === "trends" && <Trends entries={entries} profile={profile} onDelete={delEntries} />}
        {tab === "products" && <Products profile={profile} />}
        {tab === "learn" && <Learn profile={profile} />}
        {tab === "you" && <You profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={setSheet} onErase={erase} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === "checkin" && (
        <CheckIn profile={profile} prefs={prefs} onClose={() => setSheet(null)}
          onSave={(e) => { addEntry(e); setSheet(null); setResult(e); }} />
      )}
      {sheet === "sip" && <SipCheck onClose={() => setSheet(null)} onSave={(e) => { addEntry(e); setSheet(null); }} />}
      {sheet === "weekly" && (
        <WeeklyCheck lastWeight={[...entries].sort((a, b) => b.ts - a.ts).find((e) => e.weight != null)?.weight}
          onClose={() => setSheet(null)} onSave={(e) => { addEntry(e); setSheet(null); if (e.opening != null && e.opening <= 2) setResult(e); }} />
      )}
      {sheet === "alertcard" && <AlertCardSheet profile={profile} onClose={() => setSheet(null)} />}
      {sheet === "questions" && <QuestionsSheet profile={profile} setProfile={setProfile} onClose={() => setSheet(null)} />}
      {sheet === "report" && <Report profile={profile} entries={entries} onClose={() => setSheet(null)} />}
      {sheet === "backup" && <Backup payload={{ profile, entries }} onRestore={restore} onClose={() => setSheet(null)} />}
      {result && <ResultSheet entry={result} profile={profile} onClose={() => setResult(null)} />}
    </div>
  );
}
