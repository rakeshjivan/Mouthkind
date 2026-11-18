// ─── Medicine look-up ──────────────────────────────────────────────────────
// Generic names and common Australian brand names for medicines that can dry
// the mouth, each mapped to one of the medicine groups in the risk check
// ("medTypes.<group>", or "cancer.immuno"). Bundled with the app, so nothing
// the person types leaves their device.
//
// Group membership follows the WWOM VI systematic review of medicines that
// cause salivary gland dysfunction (Wolff 2017), plus GLP-1 medicines
// (Massarotto 2026), isotretinoin (Alqahtani 2026) and immune checkpoint
// inhibitors (Bitoun 2024). Brand names are as commonly sold in Australia;
// this is not a complete list — anything not found is kept as typed, and the
// person is told to ask their pharmacist.
//
// Everyday medicines that aren't known to dry the mouth are listed too (group null), so people
// find what they take, see it isn't a concern, and it still counts towards how many they take.
//
// Each medicine also carries what it's taken for (the purposes on the "What do you take
// medicines for?" screen), so a named medicine replaces the guess for that purpose.
//
// M(generic, [brands], group, purposes?) · N(generic, [brands], purposes) = not known to dry the mouth
const GROUP_PURPOSE = {
  tca: ["mood", "pain", "sleep"], antidep: ["mood"], antipsych: ["mental", "mood"], sleep: ["sleep", "mood"],
  antihist: ["allergy", "sleep", "stomach"], allergy: ["allergy"], opioid: ["pain"], seizure: ["nerve", "pain", "mood"],
  stimulant: ["adhd"], parkinson: ["parkinsons"], relaxant: ["muscle", "pain"], migraine: ["migraine"], cannabis: ["pain", "sleep", "other"],
  bladder: ["bladder"], glp1: ["weight", "diabetes"], weightloss: ["weight"], bp: ["bp"], prostate: ["prostate", "bp"],
  inhaler: ["breathing"], gut: ["stomach"], acne: ["acne"], smoking: ["smoking"], decong: ["allergy"], "cancer.immuno": ["other"],
};
const M = (g, b, c, p) => ({ g, b, c, p: p || GROUP_PURPOSE[c] || ["other"] });
const N = (g, b, p) => ({ g, b, c: null, p });
const T = (c) => (!c ? null : c.includes(".") ? c : `medTypes.${c}`);

const LIST = [
  // Older (tricyclic) antidepressants
  M("amitriptyline", ["Endep"], "tca"), M("nortriptyline", ["Allegron"], "tca"), M("doxepin", ["Deptran", "Sinequan"], "tca"),
  M("clomipramine", ["Anafranil"], "tca"), M("imipramine", ["Tofranil"], "tca"), M("dosulepin (dothiepin)", ["Dothep", "Prothiaden"], "tca"),
  // Other antidepressants
  M("sertraline", ["Zoloft"], "antidep"), M("escitalopram", ["Lexapro"], "antidep"), M("citalopram", ["Cipramil"], "antidep"),
  M("fluoxetine", ["Prozac", "Lovan", "Zactin"], "antidep"), M("paroxetine", ["Aropax"], "antidep"), M("fluvoxamine", ["Luvox"], "antidep"),
  M("venlafaxine", ["Efexor-XR"], "antidep"), M("desvenlafaxine", ["Pristiq"], "antidep"), M("duloxetine", ["Cymbalta"], "antidep"),
  M("mirtazapine", ["Avanza", "Remeron"], "antidep"), M("vortioxetine", ["Brintellix"], "antidep"), M("agomelatine", ["Valdoxan"], "antidep"),
  M("reboxetine", ["Edronax"], "antidep"), M("moclobemide", ["Aurorix"], "antidep"), M("phenelzine", ["Nardil"], "antidep"),
  // Antipsychotics and lithium
  M("quetiapine", ["Seroquel"], "antipsych"), M("olanzapine", ["Zyprexa"], "antipsych"), M("risperidone", ["Risperdal"], "antipsych"),
  M("aripiprazole", ["Abilify"], "antipsych"), M("clozapine", ["Clozaril"], "antipsych"), M("paliperidone", ["Invega"], "antipsych"),
  M("ziprasidone", ["Zeldox"], "antipsych"), M("asenapine", ["Saphris"], "antipsych"), M("lurasidone", ["Latuda"], "antipsych"),
  M("haloperidol", ["Serenace"], "antipsych"), M("chlorpromazine", ["Largactil"], "antipsych"), M("lithium", ["Lithicarb", "Quilonum"], "antipsych"),
  // Sleeping and anxiety tablets
  M("temazepam", ["Normison", "Temaze"], "sleep"), M("diazepam", ["Valium", "Antenex"], "sleep"), M("oxazepam", ["Serepax", "Alepam"], "sleep"),
  M("alprazolam", ["Xanax", "Kalma"], "sleep"), M("lorazepam", ["Ativan"], "sleep"), M("clonazepam", ["Rivotril", "Paxam"], "sleep"),
  M("nitrazepam", ["Mogadon"], "sleep"), M("zolpidem", ["Stilnox"], "sleep"), M("zopiclone", ["Imovane"], "sleep"),
  // Drowsy antihistamines
  M("promethazine", ["Phenergan", "Avomine"], "antihist"), M("doxylamine", ["Restavit"], "antihist"), M("cyproheptadine", ["Periactin"], "antihist"),
  M("diphenhydramine", ["Benadryl"], "antihist"), M("dexchlorpheniramine", ["Polaramine"], "antihist"), M("pheniramine", ["Avil"], "antihist"),
  M("pizotifen", ["Sandomigran"], "antihist"),
  // Non-drowsy antihistamines
  M("cetirizine", ["Zyrtec"], "allergy"), M("loratadine", ["Claratyne"], "allergy"), M("fexofenadine", ["Telfast"], "allergy"),
  M("desloratadine", ["Aerius"], "allergy"), M("bilastine", ["Lertamine"], "allergy"),
  // Opioids
  M("oxycodone", ["Endone", "OxyContin", "Targin", "OxyNorm"], "opioid"), M("tramadol", ["Tramal", "Zydol"], "opioid"),
  M("tapentadol", ["Palexia"], "opioid"), M("codeine", ["Panadeine Forte"], "opioid"), M("morphine", ["MS Contin", "Kapanol", "Ordine"], "opioid"),
  M("hydromorphone", ["Dilaudid", "Jurnista"], "opioid"), M("fentanyl", ["Durogesic"], "opioid"),
  M("buprenorphine", ["Norspan", "Suboxone", "Subutex", "Sublocade"], "opioid"), M("methadone", ["Biodone", "Physeptone"], "opioid"),
  // Epilepsy and nerve pain
  M("pregabalin", ["Lyrica"], "seizure"), M("gabapentin", ["Neurontin"], "seizure"), M("carbamazepine", ["Tegretol"], "seizure"),
  M("sodium valproate", ["Epilim"], "seizure"), M("lamotrigine", ["Lamictal"], "seizure"), M("topiramate", ["Topamax"], "seizure"),
  M("levetiracetam", ["Keppra"], "seizure"), M("oxcarbazepine", ["Trileptal"], "seizure"), M("phenytoin", ["Dilantin"], "seizure"),
  // ADHD
  M("methylphenidate", ["Ritalin", "Concerta"], "stimulant"), M("dexamfetamine", [], "stimulant"), M("lisdexamfetamine", ["Vyvanse"], "stimulant"),
  M("atomoxetine", ["Strattera"], "stimulant"), M("guanfacine", ["Intuniv"], "stimulant"),
  // Parkinson's
  M("levodopa", ["Sinemet", "Madopar", "Kinson", "Stalevo"], "parkinson"), M("benztropine", ["Cogentin"], "parkinson"),
  M("trihexyphenidyl (benzhexol)", ["Artane"], "parkinson"), M("pramipexole", ["Sifrol"], "parkinson"), M("ropinirole", ["Repreve"], "parkinson"),
  M("rotigotine", ["Neupro"], "parkinson"), M("amantadine", ["Symmetrel"], "parkinson"), M("rasagiline", ["Azilect"], "parkinson"),
  // Muscle relaxants
  M("baclofen", ["Lioresal", "Clofen"], "relaxant"), M("orphenadrine", ["Norflex", "Norgesic"], "relaxant"),
  // Migraine
  M("sumatriptan", ["Imigran"], "migraine"), M("rizatriptan", ["Maxalt"], "migraine"), M("zolmitriptan", ["Zomig"], "migraine"),
  M("naratriptan", ["Naramig"], "migraine"), M("eletriptan", ["Relpax"], "migraine"),
  // Cannabis
  M("medicinal cannabis (THC)", [], "cannabis"),
  // Bladder
  M("oxybutynin", ["Ditropan", "Oxytrol"], "bladder"), M("solifenacin", ["Vesicare"], "bladder"), M("tolterodine", ["Detrusitol"], "bladder"),
  M("darifenacin", ["Enablex"], "bladder"), M("propantheline", ["Pro-Banthine"], "bladder"),
  // GLP-1 and weight loss
  M("semaglutide", ["Ozempic", "Wegovy", "Rybelsus"], "glp1"), M("tirzepatide", ["Mounjaro"], "glp1"), M("liraglutide", ["Saxenda", "Victoza"], "glp1"),
  M("dulaglutide", ["Trulicity"], "glp1"), M("exenatide", ["Byetta", "Bydureon"], "glp1"),
  M("phentermine", ["Duromine", "Metermine"], "weightloss"), M("naltrexone with bupropion", ["Contrave"], "weightloss"),
  // Fluid and blood pressure tablets
  M("furosemide (frusemide)", ["Lasix", "Urex"], "bp"), M("hydrochlorothiazide", [], "bp"), M("indapamide", ["Natrilix"], "bp"),
  M("spironolactone", ["Aldactone"], "bp"), M("clonidine", ["Catapres"], "bp"), M("moxonidine", ["Physiotens"], "bp"),
  M("methyldopa", ["Hydopa"], "bp"), M("metoprolol", ["Betaloc", "Minax", "Toprol-XL"], "bp"), M("atenolol", ["Tenormin", "Noten"], "bp"),
  M("propranolol", ["Inderal", "Deralin"], "bp"), M("bisoprolol", ["Bicor"], "bp"), M("carvedilol", ["Dilatrend"], "bp"),
  // Alpha-blockers
  M("tamsulosin", ["Flomaxtra"], "prostate"), M("prazosin", ["Minipress"], "prostate"), M("terazosin", ["Hytrin"], "prostate"),
  M("doxazosin", ["Cardura"], "prostate"), M("silodosin", ["Urorec"], "prostate"),
  // Inhalers
  M("tiotropium", ["Spiriva", "Spiolto"], "inhaler"), M("umeclidinium", ["Incruse", "Anoro", "Trelegy"], "inhaler"), M("ipratropium", ["Atrovent"], "inhaler"),
  M("glycopyrronium", ["Seebri", "Ultibro"], "inhaler"), M("aclidinium", ["Bretaris", "Brimica"], "inhaler"),
  M("fluticasone with salmeterol", ["Seretide"], "inhaler"), M("budesonide with formoterol", ["Symbicort"], "inhaler"), M("fluticasone with vilanterol", ["Breo"], "inhaler"),
  // Stomach, nausea, travel sickness
  M("hyoscine butylbromide", ["Buscopan"], "gut"), M("hyoscine hydrobromide", ["Kwells", "Travacalm"], "gut"), M("prochlorperazine", ["Stemetil"], "gut"),
  M("dicyclomine", ["Merbentyl"], "gut"),
  // Acne
  M("isotretinoin", ["Roaccutane", "Oratane"], "acne"),
  // Quit smoking
  M("varenicline", ["Champix"], "smoking"), M("bupropion", ["Zyban"], "smoking"),
  // Decongestants
  M("pseudoephedrine", ["Sudafed"], "decong"), M("phenylephrine", [], "decong"),
  // Cancer immunotherapy
  M("pembrolizumab", ["Keytruda"], "cancer.immuno"), M("nivolumab", ["Opdivo"], "cancer.immuno"), M("ipilimumab", ["Yervoy"], "cancer.immuno"),
  M("atezolizumab", ["Tecentriq"], "cancer.immuno"), M("durvalumab", ["Imfinzi"], "cancer.immuno"), M("cemiplimab", ["Libtayo"], "cancer.immuno"),
  // Inhalers that relieve (asthma)
  M("salbutamol", ["Ventolin", "Asmol"], "inhaler"), M("terbutaline", ["Bricanyl"], "inhaler"),

  // ── Everyday medicines not known to dry the mouth ──
  // Pain and inflammation
  N("paracetamol", ["Panadol", "Panamax", "Panadol Osteo"], ["pain"]), N("ibuprofen", ["Nurofen", "Brufen"], ["pain"]),
  N("naproxen", ["Naprosyn", "Naprogesic"], ["pain"]), N("diclofenac", ["Voltaren"], ["pain"]), N("celecoxib", ["Celebrex"], ["pain"]),
  N("meloxicam", ["Mobic"], ["pain"]), N("aspirin", ["Cartia", "Astrix", "Disprin"], ["bp", "pain"]),
  // Cholesterol, heart, blood thinners
  N("atorvastatin", ["Lipitor"], ["bp"]), N("rosuvastatin", ["Crestor"], ["bp"]), N("simvastatin", ["Zocor"], ["bp"]),
  N("pravastatin", ["Pravachol"], ["bp"]), N("ezetimibe", ["Ezetrol"], ["bp"]), N("perindopril", ["Coversyl"], ["bp"]),
  N("ramipril", ["Tritace"], ["bp"]), N("candesartan", ["Atacand"], ["bp"]), N("irbesartan", ["Avapro"], ["bp"]),
  N("telmisartan", ["Micardis"], ["bp"]), N("olmesartan", ["Olmetec"], ["bp"]), N("valsartan", ["Diovan"], ["bp"]),
  N("amlodipine", ["Norvasc"], ["bp"]), N("lercanidipine", ["Zanidip"], ["bp"]), N("felodipine", ["Plendil"], ["bp"]),
  N("diltiazem", ["Cardizem"], ["bp"]), N("verapamil", ["Isoptin"], ["bp"]), N("apixaban", ["Eliquis"], ["bp"]),
  N("rivaroxaban", ["Xarelto"], ["bp"]), N("dabigatran", ["Pradaxa"], ["bp"]), N("warfarin", ["Coumadin", "Marevan"], ["bp"]),
  N("clopidogrel", ["Plavix"], ["bp"]), N("ticagrelor", ["Brilinta"], ["bp"]), N("digoxin", ["Lanoxin"], ["bp"]),
  N("isosorbide mononitrate", ["Imdur"], ["bp"]), N("glyceryl trinitrate", ["Nitrolingual", "Anginine"], ["bp"]),
  // Diabetes
  N("metformin", ["Diabex", "Diaformin"], ["diabetes"]), N("gliclazide", ["Diamicron"], ["diabetes"]), N("sitagliptin", ["Januvia"], ["diabetes"]),
  N("empagliflozin", ["Jardiance"], ["diabetes"]), N("dapagliflozin", ["Forxiga"], ["diabetes"]),
  N("insulin", ["Lantus", "Optisulin", "NovoRapid", "Humalog", "Toujeo", "Ryzodeg"], ["diabetes"]),
  // Stomach and bowels
  N("pantoprazole", ["Somac"], ["stomach"]), N("esomeprazole", ["Nexium"], ["stomach"]), N("omeprazole", ["Losec"], ["stomach"]),
  N("rabeprazole", ["Pariet"], ["stomach"]), N("famotidine", ["Pepcid"], ["stomach"]), N("ondansetron", ["Zofran"], ["stomach"]),
  N("metoclopramide", ["Maxolon"], ["stomach"]), N("loperamide", ["Imodium"], ["stomach"]), N("docusate", ["Coloxyl"], ["stomach"]),
  N("macrogol", ["Movicol", "OsmoLax"], ["stomach"]), N("lactulose", ["Duphalac"], ["stomach"]),
  // Breathing and allergy
  N("budesonide inhaler", ["Pulmicort"], ["breathing"]), N("fluticasone inhaler", ["Flixotide"], ["breathing"]),
  N("montelukast", ["Singulair"], ["breathing", "allergy"]), N("fluticasone nasal spray", ["Flixonase"], ["allergy"]),
  N("mometasone nasal spray", ["Nasonex"], ["allergy"]), N("budesonide nasal spray", ["Rhinocort"], ["allergy"]),
  // Thyroid, hormones, bones
  N("levothyroxine", ["Oroxine", "Eutroxsig"], ["other"]), N("carbimazole", ["Neo-Mercazole"], ["other"]),
  N("prednisolone", ["Panafcortelone", "Solone"], ["other"]), N("estradiol (HRT)", ["Estrogel", "Estradot", "Climara"], ["other"]),
  N("contraceptive pill", [], ["other"]), N("alendronate", ["Fosamax"], ["other"]), N("risedronate", ["Actonel"], ["other"]),
  N("denosumab", ["Prolia"], ["other"]), N("vitamin D", ["Ostelin"], ["other"]), N("calcium", ["Caltrate"], ["other"]),
  N("iron", ["Ferro-Grad", "Maltofer", "Ferro-tab"], ["other"]), N("vitamin B12", [], ["other"]), N("fish oil", [], ["other"]),
  // Arthritis, gout, immune
  N("methotrexate", ["Methoblastin"], ["other"]), N("hydroxychloroquine", ["Plaquenil"], ["other"]), N("allopurinol", ["Zyloprim", "Progout"], ["other"]),
  N("colchicine", ["Colgout"], ["other"]), N("adalimumab", ["Humira"], ["other"]), N("etanercept", ["Enbrel"], ["other"]),
  // Prostate, bladder, men's health
  N("finasteride", ["Proscar"], ["prostate"]), N("dutasteride", ["Avodart"], ["prostate"]), N("mirabegron", ["Betmiga"], ["bladder"]),
  N("sildenafil", ["Viagra"], ["other"]), N("tadalafil", ["Cialis"], ["prostate", "other"]),
  // Memory, sleep, smoking
  N("donepezil", ["Aricept"], ["other"]), N("memantine", ["Ebixa"], ["other"]), N("rivastigmine", ["Exelon"], ["other"]),
  N("melatonin", ["Circadin"], ["sleep"]), N("nicotine patches or gum", ["Nicorette", "Nicabate", "QuitX"], ["smoking"]),
  // Antibiotics (short courses)
  N("amoxicillin", ["Amoxil", "Augmentin"], ["other"]), N("cefalexin", ["Keflex"], ["other"]), N("doxycycline", ["Doryx"], ["other", "acne"]),
  N("trimethoprim", ["Alprim"], ["other"]), N("nitrofurantoin", ["Macrodantin"], ["other"]), N("metronidazole", ["Flagyl"], ["other"]),
];

export const MEDICINES = LIST.map((m, i) => ({ id: `m${i}`, ...m, c: T(m.c) }));

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const INDEX = MEDICINES.map((m) => ({ m, keys: [m.g, ...m.b].map(norm) }));

/** Search by generic or brand name; best matches first (starts-with before contains). */
export function searchMedicines(q, limit = 8) {
  const s = norm(q);
  if (s.length < 2) return [];
  const hits = [];
  for (const { m, keys } of INDEX) {
    let rank = 9, brand = null;
    keys.forEach((k, i) => {
      const r = k === s ? 0 : k.startsWith(s) ? 1 : k.split(" ").some((w) => w.startsWith(s)) ? 2 : k.includes(s) ? 3 : 9;
      if (r < rank) { rank = r; brand = i ? m.b[i - 1] : null; }
    });
    if (rank < 9) hits.push({ m, rank, brand });
  }
  return hits.sort((a, b) => a.rank - b.rank || a.m.g.localeCompare(b.m.g)).slice(0, limit);
}

export const medicineById = (id) => MEDICINES.find((m) => m.id === id);

/** The groups ("question.option") covered by a set of looked-up medicines. */
export const groupsFor = (list = []) => [...new Set(list.map((x) => (x.id ? medicineById(x.id)?.c : null)).filter(Boolean))];
