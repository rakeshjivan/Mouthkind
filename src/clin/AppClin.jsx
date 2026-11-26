// ─── Mouthkind, clinician-in-the-loop (TGA option 3) ───────────────────────
// The full app's engine, unchanged, with its output moved to a clinician view:
//  • Patient side: questionnaires, the dry mouth assessment (score and band), a mouth
//    diary with fixed safety lines on the red-flag questions, pH and jaw records, the care
//    team, When to worry, Learn and Shop. No risk band, factor or advice of the app's own.
//  • Clinician view: patient-reported data, the referenced assessment and the plan options,
//    with allergy, dialysis and no-teeth warnings. The professional chooses and signs.
//  • The patient follows the signed plan ("Your plan from …") until the review date.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, Sheet, Sources } from "../components/ui.jsx";
import { Home, latestOf, phReadings, sipReadings } from "../screens/home.jsx";
import { LearnPage, PlanPage } from "../screens/care.jsx";
import { Shop } from "../screens/shop.jsx";
import { careContext } from "../data/care.js";
import { phPattern } from "../data/ph.js";
import { scoreRisk } from "../data/risk.js";
import { RiskFlow, dryModel } from "../screens/risk.jsx";
import { profileAnswers } from "../data/person.js";
import { activeTreatment, inCancerCare } from "../data/journey.js";
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
import { dueWords, freqFor, nextCheck } from "../data/schedule.js";
import { buildRoutine, tickEntry, ticksToday } from "../data/routine.js";
import { CallSheet, HelpBar, WorrySheet } from "../screens/help.jsx";
import { PlanItem } from "../screens/plan.jsx";
import { DEFAULT_PREFS, DEFAULT_PROFILE, fmtDate, load, save, wipe } from "../lib/store.js";
import { DiarySaved, LiteSummary, Records } from "../lite/screens.jsx";
import { ClinicianSheet, PlanFrom } from "./Clinician.jsx";
import { dryFactors, findingsText, sendFindings } from "./findings.js";
import { denturesFrom, teethQuestions, teethRecord } from "../data/teeth.js";
import { infoFor } from "../data/optionInfo.js";

const TABS = [
  { id: "home", label: "Today", icon: "home" },
  { id: "tracker", label: "Records", icon: "chart" },
  { id: "learn", label: "Learn", icon: "book" },
  { id: "plan", label: "My plan", icon: "leaf" },
  { id: "shop", label: "Shop", icon: "cart" },
];

export const PURPOSE = "Mouthkind supports registered health professionals to assess dry mouth in their patients and to choose a mouth care plan, using referenced, published criteria that the professional can review. Patients use it to complete questionnaires and a symptom diary, record saliva pH, keep their care team's contacts, read general information, and follow the plan their professional has chosen. It does not diagnose, and it does not replace the professional's judgement.";

const ABOUT = (
  <details className="panel about">
    <summary><h2 className="panel-title">About Mouthkind</h2><Icon name="chev" size={18} /></summary>
    <p><strong>What it's for.</strong> {PURPOSE}</p>
    <p><strong>How the questions work.</strong> Your answers stay on this phone until you show or send them. A dentist or another health professional uses them to choose your plan. The dry mouth assessment is five questions from the Summated Xerostomia Inventory, a validated measure of dry mouth symptoms (Thomson et al. 2011), added up by its fixed rules to a score from 5 to 15. Your first one is your baseline, and later ones are compared with it.</p>
    <p><strong>Who made it.</strong> Dr Rakesh Jivan, a dentist. He is Scientific Affairs Manager at GC Australasia, which makes GC Tooth Mousse™, GC Tooth Mousse™ Plus, GC Dry Mouth Gel and GC Saliva-Check BUFFER. Products appear in your plan only when your professional chooses them.</p>
    <p><strong>Where the information comes from.</strong> Guidelines and studies are listed under "Sources" on each topic.</p>
    <p><strong>Your privacy.</strong> Everything stays on this device. Nothing is sent anywhere unless you choose to share or back it up.</p>
  </details>
);

/**
 * The end of the dry mouth questions: saved, with no result of the app's own. Below it, the
 * person's own record of what can affect a dry mouth: what they told us that is known to dry
 * the mouth, with the same general information everyone giving that answer sees.
 */
function SavedForDentist({ entry, onClose, onRedo, next, what }) {
  const x = entry?.kind === "risk" ? dryFactors(entry.answers) : null;
  return (
    <Sheet title={what} onClose={onClose}
      footer={<>
        {onRedo && <button className="btn ghost" onClick={onRedo}>{next ? "Edit answers" : "Change my answers"}</button>}
        {next ? <button className="btn primary big" onClick={next.go}>{next.label}</button> : <button className="btn primary big" onClick={onClose}>Done</button>}
      </>}>
      <div className="lite-saved"><span className="lite-saved-mark" aria-hidden="true"><Icon name="check" size={28} stroke={3} /></span>
        <h2 className="q">Saved</h2>
        <p className="lede">Your answers from {fmtDate(entry.ts)} are saved on this phone. You can show them to a dentist, doctor, nurse or pharmacist, or send them from Today with "Send my answers".</p></div>
      {x && <DryFactors x={x} />}
      {entry?.kind === "teeth" && <TeethRec answers={entry.answers} />}
    </Sheet>
  );
}

function TeethRec({ answers }) {
  const r = teethRecord(answers);
  return (
    <section className="dryrec" aria-label="Your teeth and gums">
      <h3 className="list-h first">Your teeth and gums</h3>
      {r.book && <p className="teeth-book"><Icon name="alert" size={18} /> Book in with a dentist. Some of your answers are worth having checked.</p>}
      <div className="dryrec-g"><ul>{r.rows.map((x) => <li key={x.q + x.label}><strong>{x.label}</strong><span>{x.info}</span></li>)}</ul></div>
    </section>
  );
}

const KNOWN = { known: "known to dry the mouth", reported: "dry mouth sometimes reported", no: "not known to dry the mouth", unknown: "not in our list: ask your pharmacist" };
function DryFactors({ x }) {
  return (
    <section className="dryrec" aria-label="What can affect a dry mouth">
      <h3 className="list-h first">What can affect a dry mouth</h3>
      <p className="soft-note">{x.none ? (x.unsure.length ? "Nothing you were sure of is known to dry the mouth." : "Nothing you told us is known to dry the mouth.") : "You told us about these. Each is known to affect saliva or to make a dry mouth more likely. This is general information, not a result. A dentist, doctor or pharmacist can go through it with you."}</p>
      {x.groups.map((g) => (
        <div key={g.id} className="dryrec-g">
          <h4>{g.label}</h4>
          <ul>{g.rows.map((r) => <li key={`${r.q}.${r.v}`}><strong>{r.label}</strong>{r.why && <span>{r.why}</span>}</li>)}</ul>
        </div>
      ))}
      {x.named.length > 0 && (
        <div className="dryrec-g"><h4>Medicines you listed</h4>
          <ul>{x.named.map((m) => <li key={m.name}><strong>{m.name}</strong><span>{KNOWN[m.known]}</span></li>)}</ul>
          <p className="soft-note">Never stop or change a medicine yourself. Your pharmacist or GP can review them with you.</p></div>
      )}
      {x.unsure.length > 0 && <p className="soft-note dryrec-unsure">You weren't sure about {x.unsure.join(", ").toLowerCase()}. A pharmacist, GP or dentist can help you work it out, and you can change your answers any time.</p>}
      {x.groups.some((g) => g.rows.some((r) => r.refs.length)) && <details className="srcs"><summary>Sources</summary><Sources refs={[...new Set(x.groups.flatMap((g) => g.rows.flatMap((r) => r.refs)))]} /></details>}
    </section>
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
  // "advice" was the old Help tab: its plan view is now My plan, its reading is Learn.
  const go = (t, f = null) => {
    if (t === "advice") { if (!f || f === "plan") { t = "plan"; f = null; } else { t = "learn"; if (f === "learn") f = null; } }
    setSheet(null); setTab(t); setFocus(f); window.scrollTo(0, 0);
  };

  // The engine, as in the full app: it feeds the clinician view only.
  const risk = latestOf(entries, "risk");
  const teeth = latestOf(entries, "teeth");
  const riskR = risk && scoreRisk(risk.answers);
  const latestSip = sipReadings(entries).at(-1)?.sip ?? null;
  const phLevel = phPattern(phReadings(entries)).level;
  const fromProfile = profileAnswers(profile);
  // No tooth decay check in this build: the dentist assesses decay in the chair. Any decay
  // answers saved by an older version are left out.
  const view = useMemo(() => entries.filter((e) => e.kind !== "decay"), [entries]);
  const careCtx = careContext({ factors: riskR?.factors, recorded: riskR?.recorded, sip: latestSip, ph: phLevel, risk: riskR?.band.id || null, decay: null,
    cancer: inCancerCare(profile), tx: profile.treatments || [], active: activeTreatment(profile) });
  const daily = latestOf(entries, "daily");
  const showWelcome = !profile.onboarded && !entries.length;
  const model = useMemo(() => buildModel({ profile, entries: view }), [profile, view]);
  const options = useMemo(() => buildOptions(model), [model]);
  const qs = openQuestions(model);
  const q = qs[0] || null;
  const setup = setupState({ entries: view, profile, openQs: qs.length, skip: ["decay"] });
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
  const routine = useMemo(() => (signed ? buildRoutine(plan, { noTeeth: model.noTeeth }) : []), [signed, plan, model.noTeeth]);
  const ticks = ticksToday(entries);
  const onTick = (id) => addEntry(tickEntry(entries, routine, id));
  const whyItem = whyId && plan.find((i) => i.id === whyId);
  const lastSip = [...entries].filter((e) => e.sip != null && e.kind !== "risk").sort((a, b) => b.ts - a.ts)[0];
  const send = () => sendFindings(findingsText(profile, view, signed, { patient: true }), "My Mouthkind answers");
  // Today's tiles: the six things people come back for.
  const lastPh = [...entries].filter((e) => e.ph != null).sort((a, b) => b.ts - a.ts)[0];
  const every = prefs.sipEvery || 7;
  const sipDue = nextCheck(lastSip?.ts, every), phDue = nextCheck(lastPh?.ts, every);
  const tiles = (
    <div className="today-tiles">
      <button type="button" className="tt t-ph" onClick={() => open("ph")}><Icon name="drop" size={24} /><strong>Check my saliva pH</strong><em>{lastPh ? (phDue.due ? "Due now" : dueWords(phDue)) : "2 minutes with a test strip"}</em></button>
      <button type="button" className="tt t-sip" onClick={() => open("sip")}><Icon name="chart" size={24} /><strong>My {freqFor(every).short} mouth check</strong><em>{lastSip ? (sipDue.due ? "Due now" : dueWords(sipDue)) : "5 quick questions"}</em></button>
      <button type="button" className="tt t-learn" onClick={() => go("advice", "learn")}><Icon name="book" size={24} /><strong>Learn about dry mouth</strong><em>Start with 3 short guides</em></button>
      <button type="button" className="tt t-teeth" onClick={() => go("advice", "teeth")}><Icon name="tooth" size={24} /><strong>Protect my teeth</strong><em>Why a dry mouth puts teeth at risk</em></button>
      <button type="button" className="tt t-team" onClick={() => setSheet("forteam")}><Icon name="user" size={24} /><strong>For my care team</strong><em>Hand your phone to a health professional</em></button>
      <button type="button" className="tt t-send" onClick={send}><Icon name="send" size={24} /><strong>Send my results</strong><em>To your dentist, doctor or pharmacist</em></button>
    </div>
  );
  const card = <><PlanFrom plan={signed} onOpen={() => setSheet("clinician")} onSee={() => go("advice", "plan")} /></>;

  return (
    <div className="app">
      <main className={`main${profile.onboarded && !showWelcome && tab === "home" ? " with-help" : ""}`} id="main">
        {tab === "home" && <Home profile={profile} entries={view} prefs={prefs} phSkip={!!profile.phSkip} open={open} go={go} plan={plan} setup={setup} onSetup={continueSetup} onMe={() => go("me")}
          routine={routine} ticks={ticks} onTick={onTick} onWhy={setWhyId} clin={{ plan: signed, card, tiles }} />}
        {tab === "shop" && <Shop forYou={[...new Set(plan.flatMap((it) => it.products || []))]} mineLabel="In your plan" />}
        {tab === "learn" && <LearnPage key={focus || "l"} ctx={careCtx} focus={focus} profile={profile} setProfile={setProfile} onShop={() => go("shop")} clin={{ plan: signed }} />}
        {tab === "plan" && <PlanPage ctx={careCtx} plan={plan} profile={profile} setProfile={setProfile} open={open} setup={building ? setup : null} onSetup={continueSetup}
          onShop={() => go("shop")} onSend={send} clin={{ plan: signed, onOpen: () => setSheet("clinician") }} />}
        {tab === "tracker" && <Records entries={view} open={open} onDelete={delEntries} extra={<>
          <section className="panel">
            <div className="panel-h"><h2>What can affect a dry mouth</h2><button className="link-btn" onClick={() => open(risk ? "riskresult" : "risk")}>{risk ? "See" : "Start"}</button></div>
            <p className="soft-note">{risk ? `Your medicines, health and habits, from ${fmtDate(risk.ts)}. Saved on this phone.` : "Your medicines, health and habits. About 2 minutes."}</p>
          </section>
          <section className="panel">
            <div className="panel-h"><h2>Your teeth and gums</h2><button className="link-btn" onClick={() => open(teeth ? "teethresult" : "teeth")}>{teeth ? "See" : "Start"}</button></div>
            <p className="soft-note">{teeth ? `Sensitivity, gums, brushing and diet, from ${fmtDate(teeth.ts)}. Saved on this phone.` : "Sensitivity, gums, brushing and diet. About 2 minutes."}</p>
          </section></>} />}
        {tab === "me" && <Me profile={profile} setProfile={setProfile} prefs={prefs} setPrefs={setPrefs} open={open} onErase={erase} about={ABOUT} />}
      </main>

      {profile.onboarded && !showWelcome && tab === "home" && <HelpBar profile={profile} open={open} />}
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? " on" : ""}`} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}>
            <Icon name={t.icon} stroke={tab === t.id ? 2.4 : 1.8} /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet === "risk" && <RiskFlow last={risk} model={{ ...dryModel(fromProfile), Result: (p) => <SavedForDentist {...p} what="Dry mouth risk questions" /> }} next={next} onClose={close} onSave={addEntry} />}
      {sheet === "teeth" && <RiskFlow last={teeth} next={next} onClose={close}
        onSave={(e) => { addEntry(e); const d = denturesFrom(e.answers); if (d) setProfile({ ...profile, fu: { ...(profile.fu || {}), dentures: { v: d, ts: e.ts } } }); }}
        model={{ title: "Your teeth and gums", draftKey: "teethDraft", questions: (a) => teethQuestions(a), info: (q, o) => infoFor(q.id, o.v),
          entry: (a, id) => ({ id: id || `t_${Date.now()}`, ts: Date.now(), kind: "teeth", answers: { ...a } }),
          Result: (p) => <SavedForDentist {...p} what="Teeth and gums" /> }} />}
      {sheet === "teethresult" && teeth && <SavedForDentist entry={teeth} what="Teeth and gums" onClose={close} onRedo={() => setSheet("teeth")} />}
      {sheet === "riskresult" && risk && <SavedForDentist entry={risk} what="Dry mouth risk questions" onClose={close} onRedo={() => setSheet("risk")} />}
      {sheet === "freq" && (
        <FrequencyPicker value={prefs.sipEvery} first={!!afterFreq} onClose={() => { setAfterFreq(null); close(); }}
          onPick={(d) => { setPrefs({ ...prefs, sipEvery: d }); setSheet(afterFreq); setAfterFreq(null); }} />
      )}
      {sheet === "sip" && prefs.sipEvery && <SipFlow plain every={prefs.sipEvery} previous={lastSip} onClose={close} onSave={addEntry} next={next} />}
      {sheet === "remind" && <Reminder every={prefs.sipEvery || 7} onClose={close} />}
      {sheet === "logremind" && <LogReminder prefs={prefs} setPrefs={setPrefs} onClose={close} weekly={!activeTreatment(profile)} />}
      {sheet === "ph" && <PhFlow plain readings={phReadings(entries)} next={next} onClose={close} onSave={addEntry} onCare={close}
        onSkip={building ? () => { setProfile({ ...profile, phSkip: true }); close(); } : null} />}
      {sheet === "report" && <LiteSummary entries={view} profile={profile} onClose={close} />}
      {sheet === "backup" && <Backup payload={{ profile, entries, prefs }} onRestore={restore} onClose={close} />}
      {sheet === "daily" && <DailyCheck mouthOnly profile={profile} initial={daily && sameDay(daily.ts, Date.now()) ? daily : null} onClose={close} onSave={addEntry} onSaved={() => setSheet("saved")} />}
      {sheet === "saved" && <DiarySaved onClose={close} open={open} />}
      {(sheet === "setupq" || sheet === "refineq") && <SetupQuestions clin q={q} m={model} left={qs.length} refining={sheet === "refineq"} profile={profile} setProfile={setProfile} onClose={close} onPlan={() => go("home")} />}
      {sheet === "journey" && <Journey general profile={profile} onClose={close} openTool={setSheet} onEdit={() => setSheet("situation")} />}
      {sheet === "jaw" && <JawTool plain entries={entries} onClose={close} onSave={addEntry} />}
      {sheet === "rtcard" && <RtCard profile={profile} onClose={close} />}
      {sheet === "forteam" && (
        <Sheet title="For my care team" onClose={close} footer={<button className="btn primary big" onClick={() => setSheet("clinician")}>Hand my phone to a health professional</button>}>
          <h2 className="q">Your plan comes from a health professional</h2>
          <p className="lede">When you see a dentist or another health professional, such as your doctor, nurse or pharmacist, hand them your phone. They'll go through your answers and choose your plan.</p>
          <div className="forteam-acts">
            <button type="button" className="help-link" onClick={() => setSheet("careteam")}><Icon name="phone" size={20} /><span><strong>My care team's details</strong><em>Names and numbers, find a dentist or pharmacy</em></span><Icon name="chev" size={16} /></button>
            <button type="button" className="help-link" onClick={send}><Icon name="send" size={20} /><span><strong>Send my answers</strong><em>By email or message, before you go</em></span><Icon name="chev" size={16} /></button>
          </div>
        </Sheet>
      )}
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
