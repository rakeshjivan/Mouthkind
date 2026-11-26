// ─── Mouthkind, clinician-in-the-loop (TGA option 3) ───────────────────────
// The full app's engine, unchanged, with its output moved to a clinician view:
//  • Patient side: questionnaires, the SIP-SCORE (number and the instrument's band), a mouth
//    diary with fixed safety lines on the red-flag questions, pH and jaw records, the care
//    team, When to worry, Learn and Shop. No risk band, factor or advice of the app's own.
//  • Clinician view: patient-reported data, the referenced assessment and the plan options,
//    with allergy, dialysis and no-teeth warnings. The professional chooses and signs.
//  • The patient follows the signed plan ("Your plan from …") until the review date.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, Sheet } from "../components/ui.jsx";
import { Home, latestOf, phReadings, sipReadings } from "../screens/home.jsx";
import { Care } from "../screens/care.jsx";
import { Shop } from "../screens/shop.jsx";
import { careContext } from "../data/care.js";
import { phPattern } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { RiskFlow, dryModel } from "../screens/risk.jsx";
import { profileAnswers } from "../data/person.js";
import { activeTreatment, inCancerCare } from "../data/journey.js";
import { DecayFlow } from "../screens/decay.jsx";
import { decayContext, scoreDecay } from "../data/decay.js";
import { FrequencyPicker, LogReminder, PhFlow, Reminder, SipFlow } from "../screens/extras.jsx";
import { Me } from "../screens/me.jsx";
import { Backup } from "../screens/backup.jsx";
import { Welcome } from "../screens/onboarding.jsx";
import { DailyCheck } from "../screens/daily.jsx";
import { sameDay } from "../data/daily.js";
import { ChemoToday, JawTool, Journey, Questions, RtCard } from "../screens/journey.jsx";
import { buildModel, buildOptions, openQuestions } from "../data/engine.js";
import { SetupQuestions } from "../screens/plan.jsx";
import { CareTeamEdit } from "../screens/careTeam.jsx";
import { setupState } from "../data/setup.js";
import { buildRoutine, tickEntry, ticksToday } from "../data/routine.js";
import { CallSheet, HelpBar, WorrySheet } from "../screens/help.jsx";
import { PlanItem } from "../screens/plan.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, fmtDate, load, save, wipe } from "../lib/store.js";
import { DiarySaved, LiteSummary, Records } from "../lite/screens.jsx";
import { ClinicianSheet, PlanFrom } from "./Clinician.jsx";
import { findingsText, sendFindings } from "./findings.js";

const TABS = [
  { id: "home", label: "Today", icon: "home" },
  { id: "tracker", label: "Records", icon: "chart" },
  { id: "advice", label: "Help", icon: "book" },
  { id: "shop", label: "Shop", icon: "cart" },
];

export const PURPOSE = "Mouthkind supports registered health professionals to assess dry mouth and tooth decay risk in their patients and to choose a mouth care plan, using referenced, published criteria that the professional can review. Patients use it to complete questionnaires and a symptom diary, record saliva pH, keep their care team's contacts, read general information, and follow the plan their professional has chosen. It does not diagnose, and it does not replace the professional's judgement.";

const ABOUT = (
  <details className="panel about">
    <summary><h2 className="panel-title">About Mouthkind</h2><Icon name="chev" size={18} /></summary>
    <p><strong>What it's for.</strong> {PURPOSE}</p>
    <p><strong>How the questions work.</strong> Your answers go to your dentist or care team, who use them to choose your plan. The dry mouth score is the SIP-SCORE: the five questions of the Summated Xerostomia Inventory, a published measure of dry mouth, added up by its fixed rules.</p>
    <p><strong>Who made it.</strong> Dr Rakesh Jivan, a dentist. He is Scientific Affairs Manager at GC Australasia, which makes GC Tooth Mousse™, GC Tooth Mousse™ Plus, GC Dry Mouth Gel and GC Saliva-Check BUFFER. Products appear in your plan only when your professional chooses them.</p>
    <p><strong>Where the information comes from.</strong> Guidelines and studies are listed under "Sources" on each topic.</p>
    <p><strong>Your privacy.</strong> Everything stays on this device. Nothing is sent anywhere unless you choose to share or back it up.</p>
  </details>
);

/** The end of the risk and decay checks: saved, with no result of the app's own. */
function SavedForDentist({ entry, onClose, onRedo, next, what }) {
  return (
    <Sheet title={what} onClose={onClose}
      footer={<>
        {onRedo && <button className="btn ghost" onClick={onRedo}>{next ? "Edit answers" : "Change my answers"}</button>}
        {next ? <button className="btn primary big" onClick={next.go}>{next.label}</button> : <button className="btn primary big" onClick={onClose}>Done</button>}
      </>}>
      <div className="lite-saved"><span className="lite-saved-mark" aria-hidden="true"><Icon name="check" size={28} stroke={3} /></span>
        <h2 className="q">Saved for your dentist</h2>
        <p className="lede">Your answers from {fmtDate(entry.ts)} are saved on this phone. Your dentist or care team will go through them with you and choose your plan.</p></div>
    </Sheet>
  );
}

export default function AppClin() {
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

  const open = useCallback((s) => {
    if ((s === "sip" || s === "ph") && !prefs.sipEvery) { setAfterFreq(s); setSheet("freq"); return; }
    setSheet(s);
  }, [prefs.sipEvery]);
  const close = () => setSheet(null);
  const go = (t, f = null) => { setSheet(null); setTab(t); setFocus(f); window.scrollTo(0, 0); };

  // The engine, as in the full app: it feeds the clinician view only.
  const risk = latestOf(entries, "risk");
  const riskR = risk && scoreRisk(risk.answers);
  const latestSip = sipReadings(entries).at(-1)?.sip ?? null;
  const phLevel = phPattern(phReadings(entries)).level;
  const fromProfile = profileAnswers(profile);
  const riskHas = (q, v) => [].concat(risk?.answers?.[q] || []).includes(v);
  const decayCtx = decayContext({ dryRisk: riskR?.band.id || null, sip: latestSip, ph: phLevel, ageAns: fromProfile.age || risk?.answers?.age || null,
    rtHN: riskHas("cancer", "rt_hn") || (inCancerCare(profile) && (profile.treatments || []).includes("rt_hn")), sjogren: riskHas("conditions", "sjogren"),
    acid: riskHas("conditions", "pregnantSick") ? "Morning sickness or vomiting" : riskHas("conditions", "eating") || riskHas("conditions", "reflux") ? "Vomiting or reflux" : null,
    smoke: risk ? riskHas("habits", "smoke") || riskHas("habits", "vape") : null });
  const view = useMemo(() => entries.map((e) => (e.kind === "decay" ? { ...e, ctx: { ...(e.ctx || {}), rtHN: decayCtx.rtHN, sjogren: decayCtx.sjogren, acid: decayCtx.acid, smoke: decayCtx.smoke } } : e)), [entries, decayCtx.rtHN, decayCtx.sjogren, decayCtx.acid, decayCtx.smoke]);
  const decay = latestOf(view, "decay");
  const decayR = decay && scoreDecay(decay.answers, decay.ctx);
  const careCtx = careContext({ factors: riskR?.factors, sip: latestSip, ph: phLevel, risk: riskR?.band.id || null, decay: decayR && !decayR.noTeeth ? decayR.band.id : null,
    cancer: inCancerCare(profile), tx: profile.treatments || [], active: activeTreatment(profile) });
  const daily = latestOf(entries, "daily");
  const showWelcome = !profile.onboarded && !entries.length;
  const model = useMemo(() => buildModel({ profile, entries: view }), [profile, view]);
  const options = useMemo(() => buildOptions(model), [model]);
  const qs = openQuestions(model);
  const q = qs[0] || null;
  const setup = setupState({ entries: view, profile, openQs: qs.length });
  const building = !setup.built;
  useEffect(() => { if (setup.all && !profile.planBuilt) setProfile({ ...profile, planBuilt: true }); }, [setup.all, profile, setProfile]);
  const continueSetup = () => {
    const n = setup.next;
    if (!n) { go("home"); return; }
    if (n.id === "questions") setSheet("setupq"); else open(n.sheet);
  };
  const next = building ? { label: setup.next ? `Next: ${setup.next.short}` : "Done", go: continueSetup } : null;

  // What the patient sees: only the plan their professional signed.
  const signed = profile.clinPlan || null;
  const plan = useMemo(() => signed?.items || [], [signed]);
  const routine = useMemo(() => (signed ? buildRoutine(plan, { noTeeth: !!decayR?.noTeeth }) : []), [signed, plan, decayR?.noTeeth]);
  const ticks = ticksToday(entries);
  const onTick = (id) => addEntry(tickEntry(entries, routine, id));
  const whyItem = whyId && plan.find((i) => i.id === whyId);
  const lastSip = [...entries].filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts)[0];
  const send = () => sendFindings(findingsText(profile, view, signed), "My Mouthkind answers");
  const card = <PlanFrom plan={signed} onOpen={() => setSheet("clinician")} onSee={() => go("advice", "plan")} onSend={send} />;

  return (
    <div className="app">
      <main className={`main${profile.onboarded && !showWelcome && !building && tab === "home" ? " with-help" : ""}`} id="main">
        {tab === "home" && <Home profile={profile} entries={view} prefs={prefs} phSkip={!!profile.phSkip} open={open} go={go} plan={plan} setup={setup} onSetup={continueSetup} onMe={() => go("me")}
          routine={routine} ticks={ticks} onTick={onTick} onWhy={setWhyId} clin={{ plan: signed, card }} />}
        {tab === "shop" && <Shop forYou={[...new Set(plan.flatMap((it) => it.products || []))]} />}
        {tab === "advice" && <Care key={focus || "c"} ctx={careCtx} openSheet={setSheet} focus={focus} plan={plan} sum={[]} profile={profile} setProfile={setProfile} open={open}
          setup={building ? setup : null} onSetup={continueSetup} onShop={() => go("shop")} clin={{ plan: signed, onOpen: () => setSheet("clinician") }} />}
        {tab === "tracker" && <Records entries={view} open={open} onDelete={delEntries} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} about={ABOUT} />}
      </main>

      {profile.onboarded && !showWelcome && !building && tab === "home" && <HelpBar profile={profile} open={open} />}
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

      {sheet === "risk" && <RiskFlow last={risk} model={{ ...dryModel(fromProfile), Result: (p) => <SavedForDentist {...p} what="Dry mouth questions" /> }} next={next} onClose={close} onSave={addEntry} />}
      {sheet === "riskresult" && risk && <SavedForDentist entry={risk} what="Dry mouth questions" onClose={close} onRedo={() => setSheet("risk")} />}
      {sheet === "decay" && <DecayFlow last={decay} ctx={decayCtx} next={next} onClose={close} onSave={addEntry} Result={(p) => <SavedForDentist {...p} what="Tooth decay questions" />} />}
      {sheet === "decayresult" && decay && <SavedForDentist entry={decay} what="Tooth decay questions" onClose={close} onRedo={() => setSheet("decay")} />}
      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={!!afterFreq} onClose={() => { setAfterFreq(null); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq); setAfterFreq(null); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow plain every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} next={next} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 14} onClose={close} />}
      {sheet === "logremind" && <LogReminder prefs={prefs} setPrefs={setPrefs} onClose={close} weekly={!activeTreatment(profile)} />}
      {sheet === "ph" && <PhFlow plain readings={phReadings(entries)} next={next} onClose={close} onSave={addEntry} onCare={close}
        onSkip={building ? () => { setProfile({ ...profile, phSkip: true }); close(); } : null} />}
      {sheet === "report" && <LiteSummary entries={view} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
      {sheet === "daily" && <DailyCheck profile={profile} initial={daily && sameDay(daily.ts, Date.now()) ? daily : null} onClose={close} onSave={addEntry} onSaved={() => setSheet("saved")} />}
      {sheet === "saved" && <DiarySaved onClose={close} open={open} />}
      {(sheet === "setupq" || sheet === "refineq") && <SetupQuestions clin q={q} m={model} left={qs.length} refining={sheet === "refineq"} profile={profile} setProfile={setProfile} onClose={close} onPlan={() => go("home")} />}
      {sheet === "journey" && <Journey general profile={profile} onClose={close} openTool={setSheet} onEdit={() => setSheet("situation")} />}
      {sheet === "jaw" && <JawTool plain entries={entries} onClose={close} onSave={addEntry} />}
      {sheet === "rtcard" && <RtCard profile={profile} onClose={close} />}
      {sheet === "careteam" && <CareTeamEdit profile={profile} setProfile={setProfile} onClose={close}
        setup={building && setup.next?.id === "team" ? {
          done: (p) => { setProfile({ ...p, teamAsked: true }); setSheet(qs.length ? "setupq" : null); if (!qs.length) go("home"); },
        } : null} />}
      {sheet === "worry" && <WorrySheet profile={profile} onClose={close} open={open} />}
      {sheet === "call" && <CallSheet profile={profile} onClose={close} open={open} />}
      {sheet === "clinician" && <ClinicianSheet profile={profile} setProfile={setProfile} entries={view} options={options} ctx={careCtx} onClose={close} />}
      {whyItem && (
        <Sheet title="Why this is in your plan" onClose={() => setWhyId(null)}>
          {signed && <p className="planfrom-k inline">Chosen by {signed.by.name}, {signed.by.profession}, {fmtDate(signed.ts)}</p>}
          {signed?.note && <p className="planfrom-note">"{signed.note}"</p>}
          <PlanItem it={whyItem} profile={profile} open={(s) => { setWhyId(null); open(s); }} done={false} startOpen onTick={() => setWhyId(null)} onProduct={() => { setWhyId(null); go("shop"); }}
            onAddQ={(x) => { const o = profile.ownQuestions || []; if (!o.includes(x)) setProfile({ ...profile, ownQuestions: [...o, x] }); }} />
        </Sheet>
      )}
      {sheet === "questions" && <Questions profile={profile} setProfile={setProfile} onClose={close} />}
      {sheet === "chemoday" && <ChemoToday plain profile={profile} setProfile={setProfile} onClose={() => setSheet("journey")} />}
      {(showWelcome || sheet === "situation") && <Welcome profile={profile} onDone={(p) => { setProfile(p); close(); }} />}
    </div>
  );
}
