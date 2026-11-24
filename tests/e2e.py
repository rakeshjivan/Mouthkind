"""Click-through of the main journey. Start `npm run build && npx vite preview` first."""
import asyncio, os, time
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:4173/")
OUT = os.environ.get("SHOTS", "shots")
# Live and testing keep data under different keys; use the one this build uses.
import re as _re
PFX = _re.search(r'PREFIX = "([^"]+)"', open(os.path.join(os.path.dirname(__file__), "..", "src", "lib", "store.js")).read()).group(1)
DAY = 86400000


def history():
    """Six weeks of weekly checks: dryness creeping up, pH drifting down."""
    now = int(time.time() * 1000)
    out = []
    for i, (s, ph) in enumerate(zip([7, 8, 8, 9, 10, 10], [7.0, 6.8, 6.6, 6.4, 6.6, 6.2])):
        ts = now - (6 - i) * 7 * DAY
        out.append({"id": f"s{i}", "ts": ts, "kind": "sip", "sip": s, "items": [2, 1, 2, 1, 1], "recall": 7})
        out.append({"id": f"p{i}", "ts": ts + 3600000, "kind": "ph", "ph": ph})
    return out


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = await ctx.new_page()
        _ev = pg.evaluate
        async def _evaluate(js, *args):  # scripts below are written with the testing key
            return await _ev(js.replace("mkt:", PFX), *args)
        pg.evaluate = _evaluate
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        os.makedirs(OUT, exist_ok=True)
        shot = lambda n, full=False: pg.screenshot(path=f"{OUT}/{n}.png", full_page=full)
        btn = lambda name: pg.get_by_role("button", name=name, exact=True)
        dlg = pg.get_by_role("dialog")
        pick = lambda t: dlg.get_by_role("button", name=t)
        exact = lambda t: dlg.get_by_role("button", name=t, exact=True)

        await pg.goto(BASE); await pg.wait_for_timeout(400)
        # First run: welcome
        await shot("00-welcome")
        wl = pg.locator(".welcome")
        await wl.get_by_role("button", name="Myself").click(); await pg.locator(".welcome-foot button").click(); await pg.wait_for_timeout(200)
        await pg.locator(".welcome-foot button").click(); await pg.wait_for_timeout(200)  # about you (all optional)
        await wl.get_by_role("button", name="Medicines that dry my mouth").click()
        await pg.locator(".welcome-foot button").click(); await pg.wait_for_timeout(300)
        assert await pg.locator(".setup-card").count() == 1
        # The rest of this test checks each screen on its own, so mark the plan as built.
        await pg.evaluate("() => { const p = JSON.parse(localStorage.getItem('mkt:profile')); p.planBuilt = true; localStorage.setItem('mkt:profile', JSON.stringify(p)); }")
        await pg.reload(); await pg.wait_for_timeout(400)
        assert await pg.locator(".log5").count() == 1 and await pg.locator(".routine").count() == 1
        assert await pg.locator(".helpbar").count() == 1
        await shot("01-home-empty", True)
        await pg.click("nav >> text=Progress"); await pg.wait_for_timeout(300)

        # Risk check
        await pg.click(".tile.risk"); await pg.wait_for_timeout(450)
        # Conditions first, then medicines for them
        await shot("02-risk-conditions")
        await pick("Diabetes").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
        await shot("03-risk-medfor")
        # The condition ticked comes first on the medicine screen
        assert "Diabetes" in await dlg.locator(".pick-row").first.inner_text()
        await pick("Bladder urgency or leaking").click()
        await pick("Weight loss").click()
        await pick("Strong or long-term pain").click()
        await btn("Next").click(); await pg.wait_for_timeout(250)
        box = dlg.get_by_role("searchbox")
        await box.fill("ozempic"); await pg.wait_for_timeout(150)
        await dlg.locator(".medlook-hits button").first.click()
        await box.fill("Vesic"); await pg.wait_for_timeout(150)
        await dlg.locator(".medlook-hits button").first.click()
        await box.fill("Nurofen"); await pg.wait_for_timeout(150)
        await dlg.get_by_role("button", name="Add", exact=True).click()
        await box.fill("Grandma's tonic"); await pg.wait_for_timeout(150)
        await dlg.get_by_role("button", name="Add", exact=True).click(); await pg.wait_for_timeout(150)
        assert await dlg.locator(".medlook-list li").count() == 4
        assert await dlg.locator(".medlook-list li.rep", has_text="Nurofen").count() == 1
        assert await dlg.locator(".medlook-list li.unknown", has_text="Grandma").count() == 1
        await shot("03a-risk-names")
        # Back keeps the list
        await pg.locator(".sheet-foot button", has_text="Back").click(); await pg.wait_for_timeout(250)
        assert await pg.locator(".pick-row.on", has_text="Weight loss").count() == 1
        await btn("Next").click(); await pg.wait_for_timeout(250)
        assert await dlg.locator(".medlook-list li").count() == 4
        await btn("Next").click(); await pg.wait_for_timeout(250)
        assert await dlg.get_by_text("How many different medicines").count() == 0
        await btn("None of these").click(); await pg.wait_for_timeout(250)
        await pick("I use a CPAP machine").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
        await btn("None of these").click(); await pg.wait_for_timeout(250)
        await pick("Less than 4 glasses").click(); await pg.wait_for_timeout(350)
        await pick("65 to 79").click(); await pg.wait_for_timeout(350)
        assert await dlg.get_by_role("button", name="I use a different term").count() == 1
        await pick("Woman or female").click(); await pg.wait_for_timeout(600)
        await shot("04-risk-result")
        assert await dlg.get_by_text("Added to your plan").count() == 1
        await pg.evaluate("document.querySelector('.sheet-body')?.scrollTo(0, 99999)"); await pg.wait_for_timeout(200)
        await shot("05-risk-result-end")
        await btn("Done").click(); await pg.wait_for_timeout(300)

        # Tooth decay risk: dry mouth and age come from the risk check, so those questions are skipped
        await pg.click(".tile.decay"); await pg.wait_for_timeout(450)
        await shot("05b-decay-q1")
        await exact("Yes").click(); await pg.wait_for_timeout(350)
        await pick("Yes, once").click(); await pg.wait_for_timeout(350)
        await pick("3 or more times a day").click(); await pg.wait_for_timeout(350)
        await exact("Once a day").click(); await pg.wait_for_timeout(350)
        await pick("Sometimes").click(); await pg.wait_for_timeout(350)
        await pick("My gums have shrunk back").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
        await pick("My gums bleed when I brush or floss").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
        await btn("None of these").click(); await pg.wait_for_timeout(250)
        await pick("1 to 2 years ago").click(); await pg.wait_for_timeout(350)
        assert await dlg.get_by_text("Does your mouth often feel dry?").count() == 0
        await pick("GC Tooth Mousse™ or Tooth Mousse™ Plus").click()
        await btn("See my result").click(); await pg.wait_for_timeout(600)
        await shot("05c-decay-result")
        assert await dlg.get_by_text("Switch to a high-fluoride toothpaste").count() == 1
        await pg.evaluate("document.querySelector('.sheet-body')?.scrollTo(0, 99999)"); await pg.wait_for_timeout(200)
        await shot("05d-decay-plan")
        await btn("Done").click(); await pg.wait_for_timeout(300)

        # First dry mouth check: choose how often, then the five questions
        await pg.click(".tile.sip"); await pg.wait_for_timeout(400)
        await shot("06-frequency")
        await pick("Once a week").click()
        await btn("Continue").click(); await pg.wait_for_timeout(400)
        await btn("Start").click(); await pg.wait_for_timeout(300)
        await shot("07-sip-q1")
        for v in ["Often", "Sometimes", "Often", "Sometimes", "Often"]:
            await pick(v).click(); await pg.wait_for_timeout(350)
        await shot("08-sip-result")
        await btn("Done").click(); await pg.wait_for_timeout(300)

        # pH
        await pg.click(".tile.ph"); await pg.wait_for_timeout(400)
        await dlg.get_by_role("button", name="pH 6.2").click()
        await shot("09-ph")
        await btn("Save result").click(); await pg.wait_for_timeout(300)
        await shot("09b-ph-saved")
        await btn("Done").click(); await pg.wait_for_timeout(300)
        await shot("10-home", True)

        await pg.click(".tk-foot >> text=Remind me"); await pg.wait_for_timeout(300)
        await shot("11-remind")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)

        # History for the charts
        await pg.evaluate("""(h) => { const cur = JSON.parse(localStorage.getItem('mc:entries') || '[]');
            localStorage.setItem('mc:entries', JSON.stringify([...h, ...cur])); }""", history())
        await pg.reload(); await pg.wait_for_timeout(500)
        await shot("12-home-history", True)
        await pg.click("nav >> text=Progress"); await pg.wait_for_timeout(300)
        await shot("13-results", True)
        await btn("Make a summary").click(); await pg.wait_for_timeout(300)
        await shot("14-summary", True)
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)

        await pg.click('nav >> text="Help"'); await pg.wait_for_timeout(300)
        await shot("14b-care", True)
        await pg.click("nav >> text=Shop"); await pg.wait_for_timeout(300)
        await shot("14c-shop", True)
        tm = pg.locator(".shop-item").filter(has=pg.get_by_role("heading", name="GC Tooth Mousse™", exact=True))
        await tm.get_by_role("radio", name="Strawberry").click(); await pg.wait_for_timeout(150)
        assert "98657" in await tm.locator("a.btn").get_attribute("href")
        assert "Buy Strawberry" in await tm.locator("a.btn").inner_text()
        await tm.scroll_into_view_if_needed(); await shot("14d-shop-flavour")
        await pg.emulate_media(color_scheme="dark"); await pg.wait_for_timeout(200)
        await pg.click("nav >> text=Today"); await pg.wait_for_timeout(300)
        await shot("15-home-dark", True)
        await pg.click("nav >> text=\"Today\""); await pg.wait_for_timeout(200); await pg.get_by_role("button", name="My details").click(); await pg.wait_for_timeout(200)
        await pg.get_by_label("First name").fill("Alexandra")
        await pg.get_by_label("Last name").fill("Fitzgerald-Montgomery")
        await pg.get_by_label("Day", exact=True).select_option("14")
        await pg.get_by_label("Month", exact=True).select_option(label="March")
        await pg.get_by_label("Year", exact=True).select_option("1958")
        assert await pg.get_by_text("68 years").count() >= 1
        await pg.get_by_label("Gender").select_option("woman")
        await shot("16-me-dark", True)
        await pg.click("nav >> text=Today"); await pg.wait_for_timeout(200)
        h = await pg.locator(".hello-line").evaluate("e => [e.getBoundingClientRect().height, parseFloat(getComputedStyle(e).fontSize)]")
        assert h[0] < h[1] * 1.6, h  # one line
        await shot("17-home-name")
        # The dry mouth check no longer asks age or gender once they're in Me
        await pg.emulate_media(color_scheme="light")
        await pg.click("nav >> text=Progress"); await pg.wait_for_timeout(200)
        await pg.click(".tile.risk"); await pg.wait_for_timeout(300)
        await btn("Change my answers").click(); await pg.wait_for_timeout(300)
        assert await dlg.get_by_text("How old are you?").count() == 0
        assert await dlg.get_by_text("Are you…").count() == 0
        # Cancer care: change situation, daily check with a red flag, journey, tools
        await pg.emulate_media(color_scheme="light")
        await pg.evaluate("""() => { const p = JSON.parse(localStorage.getItem('mkt:profile') || '{}');
            const d = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
            Object.assign(p, { situation: ['cancer'], treatments: ['rt_hn', 'chemo'], stage: 'during', rtStart: d(17), rtWeeks: 7, chemoDates: [d(9)],
              team: { name: 'Cancer Care', phone24: '07 5202 0000' }, contacts: { gp: { name: 'Dr Wu', phone: '07 1234 5678' } } });
            localStorage.setItem('mkt:profile', JSON.stringify(p)); }""")
        await pg.reload(); await pg.wait_for_timeout(500)
        await pg.click("nav >> text=Today"); await pg.wait_for_timeout(200)
        assert await pg.locator(".tx-line", has_text="Week 3 of 7").count() == 1
        # Two numbers saved: Call my team asks who, 24-hour line first
        await pg.locator(".helpbar .help-btn.call").click(); await pg.wait_for_timeout(300)
        picks = dlg.locator(".call-pick")
        assert await picks.count() >= 1 and await picks.first.get_attribute("href") == "tel:0752020000"
        await shot("19-call-pick")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
        await pg.locator(".log5").click(); await pg.wait_for_timeout(300)
        await dlg.locator(".painscale").nth(0).get_by_role("radio", name="8", exact=True).click()
        await dlg.locator(".painscale").nth(1).get_by_role("radio", name="5", exact=True).click()
        for q, a in [("Eating and drinking", "Soft foods only"), ("Sores or ulcers", "Ulcers"),
                     ("Did dryness wake you last night?", "Once"), ("Taste", "Changed"),
                     ("Swelling, breathing or swallowing", "No problems"), ("Bone showing in the mouth", "No"),
                     ("White patches or coating", "No"), ("Temperature of 38°C or more", "Yes")]:
            await dlg.get_by_role("radiogroup", name=q).get_by_role("radio", name=a, exact=True).click()
        await dlg.get_by_role("group", name="Anything new with your teeth or gums?").get_by_role("button", name="Broken tooth or filling").click()
        await btn("Save").click(); await pg.wait_for_timeout(300)
        assert await dlg.get_by_text("Contact your treatment team now").count() == 1
        assert await dlg.locator("a.call-btn").get_attribute("href") == "tel:0752020000"
        await shot("20-daily-red")
        await dlg.get_by_role("button", name="Log what I used").click(); await pg.wait_for_timeout(200)
        await dlg.get_by_role("button", name="GC Dry Mouth Gel").click(); await dlg.get_by_role("button", name="Save", exact=True).click(); await pg.wait_for_timeout(200)
        assert await pg.locator(".alert5.t-red").count() == 1
        await pg.click(".tx-line"); await pg.wait_for_timeout(300)
        await shot("21-journey")
        await dlg.get_by_role("button", name="Jaw opening check").click(); await pg.wait_for_timeout(200)
        await dlg.get_by_role("radio", name="2", exact=True).click(); await dlg.get_by_role("button", name="Save", exact=True).click(); await pg.wait_for_timeout(200)
        assert await dlg.get_by_text("may not be opening fully").count() == 1
        await btn("Done").click(); await pg.wait_for_timeout(200)
        await pg.click("nav >> text=Progress"); await pg.wait_for_timeout(300)
        assert await pg.get_by_text("My mouth log").count() >= 1
        assert await pg.get_by_role("heading", name="Jaw opening").count() == 1
        await shot("22-tracker-cancer", True)
        await pg.click('nav >> text="Help"'); await pg.wait_for_timeout(300)
        await pg.get_by_role("tab", name="Learn").click(); await pg.wait_for_timeout(200)
        assert await pg.get_by_text("When to get help straight away").count() == 1
        await pg.get_by_role("tab", name="My plan").click(); await pg.wait_for_timeout(200)
        await shot("23-advice-cancer", True)

        # After the plan is built: a score that rose never pops up a question; the plan
        # offers an optional "Refine your plan" link instead, and the answer updates the plan.
        await pg.evaluate("""() => {
          const now = Date.now(), D = 86400000;
          localStorage.setItem('mkt:profile', JSON.stringify({ firstName: 'Ann', onboarded: true, situation: ['meds'], planBuilt: true,
            fu: { allergy: { v: ['none'], ts: now }, gelTried: { v: 'helps', ts: now }, dryTime: { v: 'day', ts: now }, dentures: { v: 'full', ts: now } } }));
          localStorage.setItem('mkt:prefs', JSON.stringify({ theme: 'auto', text: 'm', sipEvery: 14 }));
          localStorage.setItem('mkt:entries', JSON.stringify([
            { id: 'r1', kind: 'risk', ts: now - 30*D, v: 2, answers: { conditions: [], medFor: ['bladder'], meds: '3', cancer: [], breathing: [], habits: [], water: 'mid', age: '65', sex: 'f' } },
            { id: 'k1', kind: 'decay', ts: now - 30*D, answers: { teeth: 'none' }, ctx: {} },
            { id: 's1', kind: 'sip', sip: 9, ts: now - 20*D }, { id: 's2', kind: 'sip', sip: 12, ts: now - 3600000 },
            { id: 'p1', kind: 'ph', ph: 7.0, ts: now - 3600000 } ]));
        }""")
        await pg.reload(); await pg.wait_for_timeout(500)
        assert await pg.locator(".ask").count() == 0 and await pg.locator(".setup-card").count() == 0
        await pg.click('nav >> text="Help"'); await pg.wait_for_timeout(400)
        refine = pg.locator(".refine-line")
        assert "1 quick question" in await refine.inner_text()
        await shot("24-refine-link")
        await refine.click(); await pg.wait_for_timeout(300)
        ask = dlg.locator(".ask")
        assert "got drier" in await ask.inner_text()
        await ask.get_by_role("button", name="A new or changed medicine").click()
        await ask.get_by_role("button", name="Save").click(); await pg.wait_for_timeout(300)
        assert await dlg.get_by_text("Your plan is updated").count() == 1
        await btn("See my plan").click(); await pg.wait_for_timeout(400)
        assert await pg.locator(".refine-line").count() == 0
        assert "got drier" in await pg.locator(".pitem").first.inner_text()
        await shot("26-plan", True)
        print("errors:", errs)
        assert not errs, errs
        await b.close()


asyncio.run(main())
