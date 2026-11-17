# Mouthkind

*Dry mouth, checked and tracked.*

A dry mouth app for anyone. Two parts:

1. **Dry Mouth Risk Score** — nine questions on age, medicines (number and type), health conditions, cancer treatments, sleep and breathing, and habits. A transparent points checklist (`src/data/risk.js`) gives a 0–100 score, a band, the factors driving it and what to do. Not a validated instrument: every weight and its source is in that one file, ready to tune and, later, to calibrate against flow rates.
2. **Tracker** — the GC SIP-SCORE at a frequency the person chooses (daily, weekly or fortnightly; the recall period follows the choice), saliva pH strip results, charts, a calendar reminder file, and a one-page summary for the dentist.

One codebase serves three ways:

| Where | How it's delivered | How it updates |
| --- | --- | --- |
| Website | GitHub Pages (free) | Every push to `main` |
| iPhone / Android | Open the website, then Add to Home Screen | Automatically, next time it opens |
| Mac | `.dmg` from the Releases page, or Safari ▸ File ▸ Add to Dock | Automatically — the app loads the live site |

Patient data never leaves the device. There is no server and no account.

---

## What's in it

- **Onboarding** — patient or carer, country, treatments, stage, care-team 24-hour number, dentist.
- **Daily check-in (about 30 seconds)** — temperature, danger signs, pain and dryness 0–10, eating, symptoms, optional saliva pH. Carer mode adds carer-observed signs.
- **Escalation engine** (`src/lib/rules.js`) — four levels: get help now, call today, check in 1–2 days, mention at next visit. Emergency alerts replace all other advice on screen.
- **Fortnightly SIP-SCORE** — the five validated items, never added to.
- **Weekly check** — weight and the three-finger mouth-opening test.
- **Chemotherapy dates** — shows the day-5-to-14 high-risk window.
- **Advice cards** chosen by treatment and today's answers, each with its sources.
- **Product guide** by job and country: GC products first, plus the everyday essentials described generically.
- **Dental alert card** for head and neck radiotherapy or bone-modifying drugs.
- **Questions to ask**, report for the team (print → PDF), encrypted backup, large text, dark mode.

The evidence behind every rule and card is in the evidence dossier and in `src/data/references.js`.

---

## Running it

```bash
npm install
npm run dev        # local preview with live reload
npm test           # safety-rule tests — must always pass
npm run build      # production build into dist/
```

Browser walkthrough with screenshots (needs Python Playwright):

```bash
npm run build && npx vite preview &
npm run e2e
```

---

## Setting up (one time, all free)

The repository is public: `github.com/rakeshjivan/Mouthkind`. No licence file means all rights stay with the author — others can read the code but not reuse it.

**Website** — Settings ▸ Pages ▸ Source: **GitHub Actions**. Every push to `main` then runs the tests and publishes to `https://rakeshjivan.github.io/Mouthkind/`.

**Mac app** — on GitHub: Actions ▸ **Build Mac app** ▸ **Run workflow** (or push to the `release` branch). It builds the version set in `src-tauri/tauri.conf.json`.

The `.dmg` appears under the repo's Releases about 10–15 minutes later. It loads the website above, so later website changes reach it automatically. (To point it somewhere else, add a repository variable `APP_URL`.)

### First open on a Mac

The app isn't signed with an Apple Developer certificate yet, so macOS will warn. Right-click the app in Applications ▸ **Open** ▸ **Open**. This is needed once. Signing and notarising (Apple Developer Program, US$99 a year) removes the warning and is required before handing it to patients.

### Simplest Mac route

On macOS 14 (Sonoma) or later: open the website in Safari ▸ **File ▸ Add to Dock**. You get a proper app icon, it works offline, and it always runs the latest version. No download, no warning.

---

## Updating

Change code → commit → push to `main`. Tests run, the website redeploys, and every installed copy picks up the change on next open. You only need a new Mac release tag when `src-tauri/` itself changes.

## Changing the product guide

Edit `src/data/products.js`. The tests check that fluoride toothpaste is always listed and that GC products lead each section.

## Before patients use it

- TGA (and Medsafe) classification — patient-facing triage software is plausibly a medical device.
- Advertising Code review of the product guide.
- GC's permission to use the GC SIP-SCORE name and instrument.
- Decide the maker and interest-disclosure wording on the product guide (placeholder in `src/screens/more.jsx`).
- Clinical sign-off of the escalation thresholds in `src/lib/rules.js`.
- Sign and notarise the Mac app before handing it to patients.
