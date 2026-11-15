"""Click-through of the main journey. Start `npm run build && npx vite preview` first."""
import asyncio, json, os, time
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:4173/")
OUT = os.environ.get("SHOTS", "shots")
DAY = 86400000


def sample_history():
    """Two weeks of a typical chemotherapy cycle: soreness peaks in week two, dryness creeps up."""
    now = int(time.time() * 1000)
    pain = [0, 0, 1, 1, 2, 3, 5, 6, 7, 6, 5, 4, 3]
    dry = [2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 5, 4]
    eat = ["normal"] * 6 + ["soft", "soft", "liquids", "soft", "soft", "normal", "normal"]
    out = []
    for i, (p, d, e) in enumerate(zip(pain, dry, eat)):
        ts = now - (13 - i) * DAY - 3 * 3600000
        out.append({"id": f"d{i}", "ts": ts, "kind": "daily", "pain": p, "dryness": d, "eating": e,
                    "symptoms": ["sores"] if p >= 5 else [], "sites": ["tongue", "cheekL"] if p >= 3 else [], "dryExtras": []})
    out.append({"id": "s0", "ts": now - 13 * DAY, "kind": "sip", "sip": 8, "items": [2, 1, 2, 2, 1]})
    for i, ph in enumerate([6.8, 6.6, 6.4, 6.2, 6.6]):
        out.append({"id": f"p{i}", "ts": now - (12 - i * 3) * DAY, "kind": "ph", "ph": ph})
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

        # Onboarding
        await pg.goto(BASE)
        await shot("01-welcome")
        await pg.fill("input[autocomplete=given-name]", "Margaret")
        await pg.click("text=Continue")
        await pg.click("text=Chemotherapy")
        await pg.click("text=Continue")
        await pg.fill("input[placeholder^='e.g.']", "Sunshine Coast Cancer Care")
        await pg.fill("input[placeholder^='Found']", "07 5202 0000")
        await pg.click("text=Start")
        await pg.wait_for_timeout(400)
        await shot("02-home-empty", True)

        # Log today
        await btn("Log today").click(); await pg.wait_for_timeout(500)
        await dlg.get_by_role("button", name="No", exact=True).click(); await pg.wait_for_timeout(350)
        await shot("03-sore")
        await dlg.get_by_role("button", name="6", exact=True).click()
        await shot("04-sore-set")
        await btn("Next").click(); await pg.wait_for_timeout(250)
        await pg.click("[aria-label='Tongue'][role=button]"); await pg.click("[aria-label='Left cheek'][role=button]")
        await pg.wait_for_timeout(300); await shot("05-where")
        await btn("Next").click(); await pg.wait_for_timeout(250)
        await dlg.get_by_role("button", name="Ulcers or raw spots").click()
        await shot("06-notice")
        await btn("Next").click(); await pg.wait_for_timeout(250)
        await dlg.get_by_text("Soft food only").click(); await pg.wait_for_timeout(400)
        await dlg.get_by_role("button", name="7", exact=True).click()
        await shot("07-dry")
        await btn("Next").click(); await pg.wait_for_timeout(250)
        await dlg.get_by_role("button", name="Thick or sticky saliva").click()
        await btn("Finish").click(); await pg.wait_for_timeout(400)
        await shot("08-logged", True)
        await btn("Done").click(); await pg.wait_for_timeout(300)

        # Fill in two weeks of history, then look again
        hist = sample_history()
        await pg.evaluate("""(h) => { const cur = JSON.parse(localStorage.getItem('mc:entries') || '[]');
            localStorage.setItem('mc:entries', JSON.stringify([...h, ...cur])); }""", hist)
        await pg.reload(); await pg.wait_for_timeout(500)
        await pg.click("text=Rinse with a bland mouthwash"); await pg.click("text=Brush gently, morning and night")
        await shot("09-home", True)

        await pg.click("nav >> text=Diary"); await pg.wait_for_timeout(300)
        await shot("10-diary", True)
        await pg.click("nav >> text=Relief"); await pg.wait_for_timeout(300)
        await shot("11-relief", True)
        await pg.click(".tchip.dry"); await pg.wait_for_timeout(200)
        await shot("12-relief-dry", True)
        await pg.click(".tchip.products"); await pg.wait_for_timeout(200)
        await shot("13-products", True)

        # SIP score
        await pg.click("nav >> text=Diary"); await pg.wait_for_timeout(200)
        await btn("Do it again").click(); await pg.wait_for_timeout(400)
        await shot("14-sip-intro")
        await btn("Start").click(); await pg.wait_for_timeout(250)
        for v in ["Often", "Sometimes", "Often", "Sometimes", "Often"]:
            await dlg.get_by_text(v, exact=True).click(); await pg.wait_for_timeout(350)
        await shot("15-sip-result")
        await btn("Done").click(); await pg.wait_for_timeout(300)

        await pg.click("nav >> text=Today"); await pg.click("text=Get help"); await pg.wait_for_timeout(300)
        await shot("16-help-now")
        await pg.keyboard.press("Escape")

        await pg.emulate_media(color_scheme="dark")
        await pg.wait_for_timeout(300)
        await shot("17-home-dark", True)
        await pg.click("nav >> text=Me"); await pg.wait_for_timeout(200)
        await shot("18-me-dark", True)
        print("errors:", errs)
        assert not errs, errs
        await b.close()


asyncio.run(main())
