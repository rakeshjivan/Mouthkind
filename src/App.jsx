import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "./components/ui.jsx";
import { Home, latestOf, phReadings, sipReadings } from "./screens/home.jsx";
import { Care } from "./screens/care.jsx";
import { Shop } from "./screens/shop.jsx";
import { careContext } from "./data/care.js";
import { phPattern } from "./data/ph.js";
import { scoreRisk } from "./data/risk.js";
import { RiskFlow, RiskResult, dryModel } from "./screens/risk.jsx";
import { profileAnswers } from "./data/person.js";
import { activeTreatment, inCancerCare } from "./data/journey.js";
import { DecayFlow, DecayResult } from "./screens/decay.jsx";
import { decayContext, scoreDecay } from "./data/decay.js";
import { FrequencyPicker, PhFlow, Reminder, SipFlow } from "./screens/extras.jsx";
import { Results, Summary } from "./screens/results.jsx";
import { Me } from "./screens/me.jsx";
import { Backup } from "./screens/backup.jsx";
import { Welcome } from "./screens/onboarding.jsx";
import { DailyCheck, DailyResult, UsedLog } from "./screens/daily.jsx";
import { ChemoToday, JawTool, Journey, Questions, RtCard } from "./screens/journey.jsx";
import { buildModel, buildPlan, nextQuestion, summary } from "./data/engine.js";
import { AskCard } from "./screens/plan.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, load, save, wipe } from "./lib/store.js";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "tracker", label: "Tracker", icon: "chart" },
  { id: "advice", label: "Advice", icon: "leaf" },
  { id: "shop", label: "Shop", icon: "cart" },
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
  const latestSip = sipReadings(entries).at(-1)?.sip ?? null;
  const phLevel = phPattern(phReadings(entries)).level;
  // The decay check takes dry mouth and pH from the other checks instead of asking again.
  const fromProfile = profileAnswers(profile);
  const decayCtx = decayContext({ dryRisk: riskR?.band.id || null, sip: latestSip, ph: phLevel, ageAns: fromProfile.age || risk?.answers?.age || null });
  const decay = latestOf(entries, "decay");
  const decayR = decay && scoreDecay(decay.answers, decay.ctx);
  const careCtx = careContext({ factors: riskR?.factors, sip: latestSip, ph: phLevel, risk: riskR?.band.id || null, decay: decayR && !decayR.noTeeth ? decayR.band.id : null,
    cancer: inCancerCare(profile), tx: profile.treatments || [], active: activeTreatment(profile) });
  const daily = latestOf(entries, "daily");
  const lastUsed = latestOf(entries, "used");
  const showWelcome = !profile.onboarded && !entries.length;
  // The engine: one picture of the person → the next question and the plan.
  const model = useMemo(() => buildModel({ profile, entries }), [profile, entries]);
  const plan = useMemo(() => buildPlan(model), [model]);
  const sum = useMemo(() => summary(model), [model]);
  const q = nextQuestion(model);
  const ask = (compact) => <AskCard key={compact ? "c" : "f"} q={q} m={model} profile={profile} setProfile={setProfile} onPlan={() => go("advice", "plan")} compact={compact} />;
  const lastSip = [...entries].filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts)[0];

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === "home" && <Home profile={profile} entries={entries} prefs={prefs} careCtx={careCtx} open={open} go={go} plan={plan} ask={ask(false)} />}
        {tab === "shop" && <Shop />}
        {tab === "advice" && <Care key={focus || "c"} ctx={careCtx} focus={focus} plan={plan} sum={sum} ask={ask(false)} profile={profile} open={open} />}
        {tab === "tracker" && <Results entries={entries} open={open} onDelete={delEntries} onShowRisk={() => setSheet("riskresult")} onShowDecay={() => setSheet("decayresult")} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === "risk" && <RiskFlow last={risk} model={dryModel(fromProfile)} onClose={close} onSave={addEntry} onCare={() => go("advice")} />}
      {sheet === "riskresult" && risk && <RiskResult entry={risk} onClose={close} onCare={() => go("advice")} onRedo={() => setSheet("risk")} />}
      {sheet === "decay" && <DecayFlow last={decay} ctx={decayCtx} onClose={close} onSave={addEntry} onShop={() => go("shop")} />}
      {sheet === "decayresult" && decay && <DecayResult entry={decay} onClose={close} onRedo={() => setSheet("decay")} onShop={() => go("shop")} />}
      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={!!afterFreq} onClose={() => { setAfterFreq(null); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq); setAfterFreq(null); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} followUp={ask(true)} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 14} onClose={close} />}
      {sheet === "ph" && <PhFlow readings={phReadings(entries)} followUp={ask(true)} onClose={close} onSave={addEntry} onCare={() => go("advice", "protect")} />}
      {sheet === "report" && <Summary entries={entries} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
      {sheet === "daily" && <DailyCheck profile={profile} onClose={close} onSave={addEntry} onUsed={() => setSheet("used")} followUp={ask(true)} />}
      {sheet === "dailyresult" && daily && <DailyResult entry={daily} profile={profile} onClose={close} onUsed={() => setSheet("used")} followUp={ask(true)} />}
      {sheet === "used" && <UsedLog onClose={close} onSave={addEntry} last={lastUsed?.items} />}
      {sheet === "journey" && <Journey profile={profile} onClose={close} openTool={setSheet} onEdit={() => setSheet("situation")} />}
      {sheet === "jaw" && <JawTool entries={entries} onClose={close} onSave={addEntry} />}
      {sheet === "rtcard" && <RtCard profile={profile} onClose={close} />}
      {sheet === "questions" && <Questions profile={profile} setProfile={setProfile} onClose={close} />}
      {sheet === "chemoday" && <ChemoToday profile={profile} setProfile={setProfile} onClose={() => setSheet("journey")} />}
      {(showWelcome || sheet === "situation") && <Welcome profile={profile} onDone={(p) => { setProfile(p); close(); }} />}
    </div>
  );
}
