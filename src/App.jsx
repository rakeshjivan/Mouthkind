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
import { FrequencyPicker, LogReminder, PhFlow, Reminder, SipFlow } from "./screens/extras.jsx";
import { Results, Summary } from "./screens/results.jsx";
import { Me } from "./screens/me.jsx";
import { Backup } from "./screens/backup.jsx";
import { Welcome } from "./screens/onboarding.jsx";
import { DailyCheck, DailyResult, UsedLog } from "./screens/daily.jsx";
import { sameDay } from "./data/daily.js";
import { ChemoToday, JawTool, Journey, Questions, RtCard } from "./screens/journey.jsx";
import { buildModel, buildPlan, openQuestions, summary } from "./data/engine.js";
import { SetupQuestions } from "./screens/plan.jsx";
import { CareTeamEdit } from "./screens/careTeam.jsx";
import { setupState } from "./data/setup.js";
import { buildRoutine, tickEntry, ticksToday } from "./data/routine.js";
import { CallSheet, HelpBar, WorrySheet } from "./screens/help.jsx";
import { Sheet } from "./components/ui.jsx";
import { PlanItem } from "./screens/plan.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, load, save, wipe } from "./lib/store.js";

const TABS = [
  { id: "home", label: "Today", icon: "home" },
  { id: "tracker", label: "Progress", icon: "chart" },
  { id: "advice", label: "Help", icon: "book" },
  { id: "shop", label: "Shop", icon: "cart" },
];
// Me opens from the initial at the top of Today, so the footer has four tabs with the Log
// button in the middle. Call my team and When to worry sit just above it on every screen.

export default function App() {
  const [profile, setProfileState] = useState(() => ({ ...DEFAULT_PROFILE, ...load("profile", {}) }));
  const [entries, setEntries] = useState(() => { const e = load("entries", []); return Array.isArray(e) ? e : []; });
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...load("prefs", {}) }));
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [afterFreq, setAfterFreq] = useState(null);
  const [focus, setFocus] = useState(null);
  const [whyId, setWhyId] = useState(null);

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
  const riskHas = (q, v) => [].concat(risk?.answers?.[q] || []).includes(v);
  const decayCtx = decayContext({ dryRisk: riskR?.band.id || null, sip: latestSip, ph: phLevel, ageAns: fromProfile.age || risk?.answers?.age || null,
    rtHN: riskHas("cancer", "rt_hn") || (inCancerCare(profile) && (profile.treatments || []).includes("rt_hn")), sjogren: riskHas("conditions", "sjogren"),
    acid: riskHas("conditions", "pregnantSick") ? "Morning sickness or vomiting" : riskHas("conditions", "eating") || riskHas("conditions", "reflux") ? "Vomiting or reflux" : null,
    smoke: risk ? riskHas("habits", "smoke") || riskHas("habits", "vape") : null });
  // Radiotherapy and Sjögren's always count for decay, even on results saved before they were known.
  const view = useMemo(() => entries.map((e) => (e.kind === "decay" ? { ...e, ctx: { ...(e.ctx || {}), rtHN: decayCtx.rtHN, sjogren: decayCtx.sjogren, acid: decayCtx.acid, smoke: decayCtx.smoke } } : e)), [entries, decayCtx.rtHN, decayCtx.sjogren, decayCtx.acid, decayCtx.smoke]);
  const decay = latestOf(view, "decay");
  const decayR = decay && scoreDecay(decay.answers, decay.ctx);
  const careCtx = careContext({ factors: riskR?.factors, sip: latestSip, ph: phLevel, risk: riskR?.band.id || null, decay: decayR && !decayR.noTeeth ? decayR.band.id : null,
    cancer: inCancerCare(profile), tx: profile.treatments || [], active: activeTreatment(profile) });
  const daily = latestOf(entries, "daily");
  const lastUsed = latestOf(entries, "used");
  const showWelcome = !profile.onboarded && !entries.length;
  // The engine: one picture of the person → the next question and the plan.
  const model = useMemo(() => buildModel({ profile, entries: view }), [profile, view]);
  const plan = useMemo(() => buildPlan(model), [model]);
  const sum = useMemo(() => summary(model), [model]);
  const qs = openQuestions(model);
  const q = qs[0] || null;
  // Build the plan first: every check and question, in order; then the plan.
  const setup = setupState({ entries: view, profile, openQs: qs.length });
  const building = !setup.built;
  useEffect(() => { if (setup.all && !profile.planBuilt) setProfile({ ...profile, planBuilt: true }); }, [setup.all, profile, setProfile]);
  const continueSetup = () => {
    const n = setup.next;
    if (!n) { go("home"); return; }
    if (n.id === "questions") setSheet("setupq"); else open(n.sheet);
  };
  const next = building ? { label: setup.next ? `Next: ${setup.next.short}` : "See my routine", go: continueSetup } : null;
  // Questions are only ever asked in their own step, never popped up elsewhere. After the
  // plan is built, any new ones wait behind an optional "Refine your plan" link.
  const ask = () => null;
  const refine = !building && qs.length ? { n: qs.length, go: () => setSheet("refineq") } : null;
  // Today's routine: the plan as ticks. A tick also counts as using that product.
  const routine = useMemo(() => (building ? [] : buildRoutine(plan, { noTeeth: !!decayR?.noTeeth })), [building, plan, decayR?.noTeeth]);
  const ticks = ticksToday(entries);
  const onTick = (id) => addEntry(tickEntry(entries, routine, id));
  const whyItem = whyId && plan.find((i) => i.id === whyId);
  const lastSip = [...entries].filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts)[0];

  return (
    <div className="app">
      <main className="main" id="main">
        {tab === "home" && <Home profile={profile} entries={view} prefs={prefs} phSkip={!!profile.phSkip} open={open} go={go} plan={building ? [] : plan} setup={setup} onSetup={continueSetup} onMe={() => go("me")}
          routine={routine} ticks={ticks} onTick={onTick} onWhy={setWhyId} />}
        {tab === "shop" && <Shop forYou={building ? [] : [...new Set(plan.flatMap((it) => it.products || []))]} />}
        {tab === "advice" && <Care key={focus || "c"} ctx={careCtx} openSheet={setSheet} focus={focus} plan={building ? [] : plan} sum={building ? [] : sum} ask={ask(false)} refine={refine} profile={profile} setProfile={setProfile} open={open} setup={building ? setup : null} onSetup={continueSetup} onShop={() => go("shop")} />}
        {tab === "tracker" && <Results profile={profile} prefs={prefs} entries={view} open={open} onDelete={delEntries} onShowRisk={() => setSheet("riskresult")} onShowDecay={() => setSheet("decayresult")} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} />}
      </main>

      {profile.onboarded && !showWelcome && <HelpBar profile={profile} open={open} />}
      <nav className="tabbar" aria-label="Main">
        {TABS.flatMap((t, i) => [
          // The symptom log: an action, not a tab — always one tap away, in the middle.
          ...(i === 2 && profile.onboarded ? [<button key="log" type="button" className="tab tab-log" onClick={() => open("daily")} aria-label="Log how your mouth feels today">
            <span className="tab-log-btn" aria-hidden="true"><Icon name="plus" size={26} stroke={2.6} /></span><span>Log</span>
          </button>] : []),
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>,
        ])}
      </nav>

      {sheet === "risk" && <RiskFlow last={risk} model={dryModel(fromProfile)} plan={building ? null : plan} next={next} onClose={close} onSave={addEntry} onCare={() => go("advice", "plan")} />}
      {sheet === "riskresult" && risk && <RiskResult entry={risk} plan={building ? null : plan} next={next} onClose={close} onCare={() => go("advice", "plan")} onRedo={() => setSheet("risk")} />}
      {sheet === "decay" && <DecayFlow last={decay} ctx={decayCtx} next={next} onClose={close} onSave={addEntry} onShop={() => go("shop")} />}
      {sheet === "decayresult" && decay && <DecayResult entry={decay} next={next} onClose={close} onRedo={() => setSheet("decay")} onShop={() => go("shop")} />}
      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={!!afterFreq} onClose={() => { setAfterFreq(null); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq); setAfterFreq(null); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} followUp={ask(true)} next={next} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 14} onClose={close} />}
      {sheet === "logremind" && <LogReminder prefs={prefs} setPrefs={setPrefs} onClose={close} weekly={!activeTreatment(profile)} />}
      {sheet === "ph" && <PhFlow readings={phReadings(entries)} followUp={ask(true)} next={next} onSkip={building ? () => { setProfile({ ...profile, phSkip: true }); const ready = setup.steps.filter((s) => s.id !== "ph" && s.id !== "questions").every((s) => s.done); setSheet(ready && qs.length ? "setupq" : null); if (ready && !qs.length) go("home"); } : null} onClose={close} onSave={addEntry} onCare={() => go("advice", "protect")} />}
      {sheet === "report" && <Summary entries={view} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
      {sheet === "daily" && <DailyCheck profile={profile} initial={daily && sameDay(daily.ts, Date.now()) ? daily : null} onClose={close} onSave={addEntry} onUsed={() => setSheet("used")} followUp={ask(true)} onLearn={() => go("advice", "sore")} noTeeth={!!decayR?.noTeeth} decayRisk={!!decayR && !decayR.noTeeth && decayR.band.id !== "low"} fluidLimit={riskHas("conditions", "dialysis")} onShop={() => go("shop")} onRemind={prefs.logRemind ? null : () => setSheet("logremind")} />}
      {sheet === "dailyresult" && daily && <DailyResult entry={daily} profile={profile} onLearn={() => go("advice", "sore")} noTeeth={!!decayR?.noTeeth} decayRisk={!!decayR && !decayR.noTeeth && decayR.band.id !== "low"} fluidLimit={riskHas("conditions", "dialysis")} onShop={() => go("shop")} onClose={close} onUsed={() => setSheet("used")} followUp={ask(true)} />}
      {(sheet === "setupq" || sheet === "refineq") && <SetupQuestions q={q} m={model} left={qs.length} refining={sheet === "refineq"} profile={profile} setProfile={setProfile} onClose={close} onPlan={() => (sheet === "refineq" ? go("advice", "plan") : go("home"))} />}
      {sheet === "used" && <UsedLog onClose={close} onSave={addEntry} last={lastUsed?.items} />}
      {sheet === "journey" && <Journey profile={profile} onClose={close} openTool={setSheet} onEdit={() => setSheet("situation")} />}
      {sheet === "jaw" && <JawTool entries={entries} onClose={close} onSave={addEntry} />}
      {sheet === "rtcard" && <RtCard profile={profile} onClose={close} />}
      {sheet === "careteam" && <CareTeamEdit profile={profile} setProfile={setProfile} onClose={close}
        setup={building && setup.next?.id === "team" ? {
          // In setup: saving or skipping marks the step done and moves on to the questions (or the plan).
          done: (p) => { setProfile({ ...p, teamAsked: true }); setSheet(qs.length ? "setupq" : null); if (!qs.length) go("home"); },
        } : null} />}
      {sheet === "worry" && <WorrySheet profile={profile} onClose={close} open={open} />}
      {sheet === "call" && <CallSheet profile={profile} onClose={close} open={open} />}
      {whyItem && (
        <Sheet title="Why this is in your plan" onClose={() => setWhyId(null)}>
          <PlanItem it={whyItem} profile={profile} open={(s) => { setWhyId(null); open(s); }} done={false} startOpen onTick={() => setWhyId(null)} onProduct={() => { setWhyId(null); go("shop"); }}
            onAddQ={(q) => { const x = profile.ownQuestions || []; if (!x.includes(q)) setProfile({ ...profile, ownQuestions: [...x, q] }); }} />
        </Sheet>
      )}
      {sheet === "questions" && <Questions profile={profile} setProfile={setProfile} onClose={close} />}
      {sheet === "chemoday" && <ChemoToday profile={profile} setProfile={setProfile} onClose={() => setSheet("journey")} />}
      {(showWelcome || sheet === "situation") && <Welcome profile={profile} onDone={(p) => { setProfile(p); close(); }} />}
    </div>
  );
}
