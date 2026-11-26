// ─── Mouthkind, compliant edition ──────────────────────────────────────────
// Built to stay outside TGA regulation of software as a medical device and outside the
// therapeutic goods advertising rules:
//  • No risk prediction (14D): only the SIP-SCORE questionnaire, scored by its fixed rules.
//  • No personalised treatment or product advice (14A): the routine is chosen by the person
//    from the same list everyone sees; information is general and the same for everyone.
//  • No triage from what's logged: the diary records; the When to worry list is the same
//    whatever was entered.
//  • Not advertising: no brands, no prices, no links to buy, no shop.
// The diary, scores and records stay on the phone; summaries are for the care team.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../components/ui.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, load, save, wipe } from "../lib/store.js";
import { FrequencyPicker, LogReminder, PhFlow, Reminder, SipFlow } from "../screens/extras.jsx";
import { Me } from "../screens/me.jsx";
import { Backup } from "../screens/backup.jsx";
import { Welcome } from "../screens/onboarding.jsx";
import { DailyCheck } from "../screens/daily.jsx";
import { sameDay } from "../data/daily.js";
import { ChemoToday, JawTool, Journey, Questions, RtCard } from "../screens/journey.jsx";
import { CareTeamEdit } from "../screens/careTeam.jsx";
import { CallSheet, HelpBar, WorrySheet } from "../screens/help.jsx";
import { tickEntry, ticksToday } from "../data/routine.js";
import { activeTreatment } from "../data/journey.js";
import { CARE_TOPICS } from "../data/care.js";
import { debrandAll } from "./debrand.js";
import { myRoutine } from "./routineLib.js";
import { DiarySaved, Learn, LiteSummary, Records, RoutineBuilder, Today, liteSetup } from "./screens.jsx";

// General information, without brands or product lists. Done when this edition first
// renders, not on import, so the other editions in the same bundle keep their products.
let debranded = false;

const TABS = [
  { id: "home", label: "Today", icon: "home" },
  { id: "records", label: "Records", icon: "chart" },
  { id: "learn", label: "Learn", icon: "book" },
];

const ABOUT = (
  <details className="panel about">
    <summary><h2 className="panel-title">About Mouthkind</h2><Icon name="chev" size={18} /></summary>
    <p><strong>What it is.</strong> A diary and record of your mouth, general information about dry mouth and mouth care, and your care team's numbers in one place. It doesn't diagnose, predict or recommend treatment, and it doesn't recommend or sell any product. Your dentist, doctor or pharmacist can tell you what suits you.</p>
    <p><strong>Who made it.</strong> Dr Rakesh Jivan, a dentist. He works for GC Australasia, a dental products company. To keep the information independent, Mouthkind names no brands and has no links to buy anything.</p>
    <p><strong>The dry mouth assessment.</strong> Five questions from the Summated Xerostomia Inventory, a validated measure of dry mouth symptoms, added up by its fixed rules to a score from 5 to 15.</p>
    <p><strong>Where the information comes from.</strong> Guidelines and studies are listed under "Sources" on each topic.</p>
    <p><strong>Your privacy.</strong> Everything stays on this device. Nothing is sent anywhere unless you choose to share or back it up.</p>
  </details>
);

export default function AppLite() {
  if (!debranded) { debrandAll(CARE_TOPICS); debranded = true; }
  const [profile, setProfileState] = useState(() => ({ ...DEFAULT_PROFILE, ...load("profile", {}) }));
  const [entries, setEntries] = useState(() => { const e = load("entries", []); return Array.isArray(e) ? e : []; });
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...load("prefs", {}) }));
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [afterFreq, setAfterFreq] = useState(null);

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

  // The first dry mouth score asks how often first, then goes straight into the questions.
  const open = useCallback((s) => {
    if ((s === "sip" || s === "ph") && !prefs.sipEvery) { setAfterFreq(s); setSheet("freq"); return; }
    setSheet(s);
  }, [prefs.sipEvery]);
  const close = () => setSheet(null);
  const go = (t) => { setSheet(null); setTab(t); window.scrollTo(0, 0); };

  const showWelcome = !profile.onboarded && !entries.length;
  const setup = liteSetup(profile, entries);
  // Setting up: each step leads to the next; the last one lands on Today.
  const nextStep = (p = profile, e = entries) => { const n = liteSetup(p, e).next; if (n) open(n.sheet); else { if (!p.setupDone) setProfile({ ...p, setupDone: true }); go("home"); } };
  const routine = useMemo(() => myRoutine(profile), [profile]);
  const ticks = ticksToday(entries);
  const onTick = (id) => addEntry(tickEntry(entries, routine, id));
  const daily = [...entries].filter((e) => e.kind === "daily").sort((a, b) => b.ts - a.ts)[0];
  const lastSip = [...entries].filter((e) => e.kind === "sip").sort((a, b) => b.ts - a.ts)[0];
  const phs = entries.filter((e) => e.ph != null).sort((a, b) => a.ts - b.ts);
  const inSetup = !setup.done;

  return (
    <div className="app">
      <main className={`main${profile.onboarded && !showWelcome && setup.done && tab === "home" ? " with-help" : ""}`} id="main">
        {tab === "home" && <Today profile={profile} entries={entries} prefs={prefs} open={open} onMe={() => go("me")} setup={setup} routine={routine} ticks={ticks} onTick={onTick} />}
        {tab === "records" && <Records entries={entries} open={open} onDelete={delEntries} />}
        {tab === "learn" && <Learn profile={profile} open={open} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} about={ABOUT} ageNote="All optional. Used only to fill in your summary for your care team." />}
      </main>

      {profile.onboarded && !showWelcome && setup.done && tab === "home" && <HelpBar profile={profile} open={open} />}
      <nav className="tabbar" aria-label="Main">
        {TABS.flatMap((t, i) => [
          ...(i === 2 && profile.onboarded ? [<button key="log" type="button" className="tab tab-log" onClick={() => open("daily")} aria-label="Write in your mouth diary">
            <span className="tab-log-btn" aria-hidden="true"><Icon name="plus" size={26} stroke={2.6} /></span><span>Diary</span>
          </button>] : []),
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>,
        ])}
      </nav>

      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={!!afterFreq} onClose={() => { setAfterFreq(null); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq); setAfterFreq(null); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow plain every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} next={inSetup ? { label: "Next: your care team", go: () => nextStep() } : null} />}
      {sheet === "ph" && <PhFlow plain readings={phs} onClose={close} onSave={addEntry} onCare={close} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 7} onClose={close} />}
      {sheet === "logremind" && <LogReminder prefs={prefs} setPrefs={setPrefs} onClose={close} weekly={!activeTreatment(profile)} />}
      {sheet === "daily" && <DailyCheck profile={profile} initial={daily && sameDay(daily.ts, Date.now()) ? daily : null} onClose={close} onSave={addEntry} onSaved={() => setSheet("saved")} />}
      {sheet === "saved" && <DiarySaved onClose={close} open={open} />}
      {sheet === "routine" && <RoutineBuilder profile={profile} setProfile={(p) => { setProfile(p); if (inSetup) setTimeout(() => nextStep(p, entries), 0); }} onClose={close} />}
      {sheet === "report" && <LiteSummary entries={entries} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
      {sheet === "journey" && <Journey profile={profile} onClose={close} openTool={setSheet} onEdit={() => setSheet("situation")} transform={debrandAll} />}
      {sheet === "jaw" && <JawTool entries={entries} onClose={close} onSave={addEntry} />}
      {sheet === "rtcard" && <RtCard profile={profile} onClose={close} />}
      {sheet === "careteam" && <CareTeamEdit profile={profile} setProfile={setProfile} onClose={close}
        setup={inSetup && setup.next?.id === "team" ? { done: (p) => { const q = { ...p, teamAsked: true }; setProfile(q); nextStep(q, entries); } } : null} />}
      {sheet === "worry" && <WorrySheet profile={profile} onClose={close} open={open} />}
      {sheet === "call" && <CallSheet profile={profile} onClose={close} open={open} />}
      {sheet === "questions" && <Questions profile={profile} setProfile={setProfile} onClose={close} />}
      {sheet === "chemoday" && <ChemoToday profile={profile} setProfile={setProfile} onClose={() => setSheet("journey")} />}
      {(showWelcome || sheet === "situation") && <Welcome profile={profile} onDone={(p) => { setProfile(p); close(); }} />}
    </div>
  );
}
