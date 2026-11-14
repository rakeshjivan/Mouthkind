"""Click-through check of the main journey. Start `npm run build && npx vite preview` first."""
import asyncio, os
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:4173/")
OUT = os.environ.get("SHOTS", "shots")


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

        await pg.goto(BASE)
        await shot("01-welcome")
        await pg.fill("input[autocomplete=given-name]", "Margaret")
        await pg.click("text=Continue")
        await pg.click("text=Chemotherapy"); await pg.click("text=Radiotherapy to the head or neck")
        await shot("02-treatments")
        await pg.click("text=Continue")
        await pg.fill("input[placeholder^='e.g.']", "Sunshine Coast Cancer Care")
        await pg.fill("input[placeholder^='Found']", "07 5202 0000")
        await pg.click("text=Start")
        await pg.wait_for_timeout(400)
        await shot("03-today", True)

        # A calm check-in: nothing urgent
        await btn("Start").click(); await pg.wait_for_timeout(500)
        await shot("04-fever")
        await btn("No").click(); await pg.wait_for_timeout(350)
        await shot("05-danger")
        await btn("No, none of these").click(); await pg.wait_for_timeout(200)
        await pg.click("text=A little sore"); await pg.wait_for_timeout(350)
        await shot("06-dry")
        await pg.click("text=Quite dry"); await pg.wait_for_timeout(350)
        await pg.click("text=Only soft food"); await pg.wait_for_timeout(350)
        await shot("07-new")
        # skip everything optional through to the end
        for _ in range(20):
            done = pg.get_by_role("button", name="finish")
            if await done.count() and await done.first.is_enabled():
                await done.first.click(); break
            if await btn("Not today").count():
                await btn("Not today").click()
            elif await btn("Skip").count():
                await btn("Skip").click()
            elif await btn("Nothing new").count():
                await btn("Nothing new").click()
            else:
                await btn("Next").click()
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(400)
        await shot("08-result")
        await btn("Done").click(); await pg.wait_for_timeout(300)
        await shot("09-today-done", True)

        # A second check-in that goes down the dental branches
        await pg.click("text=Something changed? Check again"); await pg.wait_for_timeout(500)
        await btn("No").click(); await pg.wait_for_timeout(350)
        await pg.click("text=My gums bleed"); await pg.click("text=I have a toothache")
        await shot("20-dental-pick")
        await btn("Next").click(); await pg.wait_for_timeout(250)
        await shot("21-gums-when")
        await pg.click("text=On their own, without touching them"); await pg.wait_for_timeout(350)
        await shot("22-gums-now")
        await pg.click("text=No, it has stopped"); await pg.wait_for_timeout(350)
        await pg.click("text=Tiny red or purple spots"); await shot("23-gums-signs")
        await btn("Next").click(); await pg.wait_for_timeout(250)
        await shot("24-tooth-kind")
        await pg.click("text=It hurts to bite on one tooth"); await pg.wait_for_timeout(350)
        await btn("None of these").click(); await pg.wait_for_timeout(250); await shot("24b-after")
        dlg = pg.get_by_role("dialog")
        await dlg.get_by_text("A little sore", exact=True).click(); await pg.wait_for_timeout(350)
        await dlg.get_by_text("Not dry", exact=True).click(); await pg.wait_for_timeout(350)
        await dlg.get_by_text("Eating as usual", exact=True).click(); await pg.wait_for_timeout(350)
        for _ in range(15):
            done = pg.get_by_role("button", name="finish")
            if await done.count(): await done.first.click(); break
            for name in ["Not today", "Skip", "Nothing new", "Next"]:
                if await btn(name).count() and await btn(name).is_enabled(): await btn(name).click(); break
            await pg.wait_for_timeout(250); await pg.wait_for_timeout(500)
        await shot("25-dental-result", True)
        await btn("Done").click(); await pg.wait_for_timeout(300)

        await pg.click("nav >> text=Help"); await pg.wait_for_timeout(200)
        await shot("10-help-tips", True)
        await btn("Products").click(); await pg.click("text=GC Dry Mouth Gel")
        await shot("11-products", True)
        await btn("Support").click(); await pg.wait_for_timeout(200)
        await shot("12-support", True)
        await btn("New Zealand").click(); await pg.wait_for_timeout(200)
        await shot("13-support-nz", True)

        await pg.click("nav >> text=My notes"); await pg.wait_for_timeout(200)
        await shot("14-notes", True)

        await pg.click("nav >> text=Today"); await pg.click("text=I need help now"); await pg.wait_for_timeout(300)
        await shot("15-help-now")
        await pg.keyboard.press("Escape")

        await pg.emulate_media(color_scheme="dark")
        await pg.click("nav >> text=Me"); await pg.wait_for_timeout(200)
        await shot("16-me-dark", True)
        print("errors:", errs)
        assert not errs, errs
        await b.close()


asyncio.run(main())
