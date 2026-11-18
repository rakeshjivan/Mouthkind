"""Click-through of the main journey. Start `npm run build && npx vite preview` first."""
import asyncio, os, time
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:4173/")
OUT = os.environ.get("SHOTS", "shots")
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
        await shot("01-home-empty", True)

        # Risk check
        await pg.click(".tile.risk"); await pg.wait_for_timeout(450)
        await shot("02-risk-age")
        await pick("65 to 79").click(); await pg.wait_for_timeout(350)
        await pick("Female").click(); await pg.wait_for_timeout(350)
        # What medicines are for, then names (optional)
        await shot("03-risk-medfor")
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
        assert await dlg.locator(".medlook-list li.safe", has_text="Nurofen").count() == 1
        assert await dlg.locator(".medlook-list li.unknown", has_text="Grandma").count() == 1
        await shot("03a-risk-names")
        # Back keeps the list
        await pg.locator(".sheet-foot button", has_text="Back").click(); await pg.wait_for_timeout(250)
        assert await pg.locator(".pick-row.on", has_text="Weight loss").count() == 1
        await btn("Next").click(); await pg.wait_for_timeout(250)
        assert await dlg.locator(".medlook-list li").count() == 4
        await btn("Next").click(); await pg.wait_for_timeout(250)
        assert await dlg.get_by_text("How many different medicines").count() == 0
        await pick("Diabetes").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
        await btn("None of these").click(); await pg.wait_for_timeout(250)
        await pick("I use a CPAP machine").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
        await btn("None of these").click(); await pg.wait_for_timeout(250)
        await pick("Less than 4 glasses").click(); await pg.wait_for_timeout(600)
        await shot("04-risk-result")
        assert await dlg.get_by_text("On a GLP-1 medicine").count() == 1
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
        await btn("None of these").click(); await pg.wait_for_timeout(250)
        await pick("1 to 2 years ago").click(); await pg.wait_for_timeout(350)
        assert await dlg.get_by_text("Does your mouth often feel dry?").count() == 0
        await pick("GC Tooth Mousse or Tooth Mousse Plus").click()
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
        await pg.click("nav >> text=Tracker"); await pg.wait_for_timeout(300)
        await shot("13-results", True)
        await btn("Make a summary").click(); await pg.wait_for_timeout(300)
        await shot("14-summary", True)
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)

        await pg.click("nav >> text=Advice"); await pg.wait_for_timeout(300)
        await shot("14b-care", True)
        await pg.click("nav >> text=Shop"); await pg.wait_for_timeout(300)
        await shot("14c-shop", True)
        tm = pg.locator(".shop-item").filter(has=pg.get_by_role("heading", name="GC Tooth Mousse", exact=True))
        await tm.get_by_role("radio", name="Strawberry").click(); await pg.wait_for_timeout(150)
        assert "98657" in await tm.locator("a.btn").get_attribute("href")
        assert "Buy Strawberry" in await tm.locator("a.btn").inner_text()
        await tm.scroll_into_view_if_needed(); await shot("14d-shop-flavour")
        await pg.emulate_media(color_scheme="dark"); await pg.wait_for_timeout(200)
        await pg.click("nav >> text=Home"); await pg.wait_for_timeout(300)
        await shot("15-home-dark", True)
        await pg.click("nav >> text=\"Me\""); await pg.wait_for_timeout(200)
        await pg.get_by_label("First name").fill("Alexandra")
        await pg.get_by_label("Last name").fill("Fitzgerald-Montgomery")
        await pg.locator("input[type=date]").fill("1958-03-14")
        await pg.get_by_label("Gender").select_option("woman")
        await shot("16-me-dark", True)
        await pg.click("nav >> text=Home"); await pg.wait_for_timeout(200)
        h = await pg.locator(".hello-line").evaluate("e => [e.getBoundingClientRect().height, parseFloat(getComputedStyle(e).fontSize)]")
        assert h[0] < h[1] * 1.6, h  # one line
        await shot("17-home-name")
        # The dry mouth check no longer asks age or gender once they're in Me
        await pg.emulate_media(color_scheme="light")
        await pg.click(".tile.risk"); await pg.wait_for_timeout(300)
        await btn("Change my answers").click(); await pg.wait_for_timeout(300)
        assert await dlg.get_by_text("How old are you?").count() == 0
        assert await dlg.get_by_text("Are you…").count() == 0
        print("errors:", errs)
        assert not errs, errs
        await b.close()


asyncio.run(main())
