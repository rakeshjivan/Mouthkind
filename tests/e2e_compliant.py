# The compliant edition (src/edition.js = "compliant"), from a fresh install:
# welcome → dry mouth score → care team → routine → Today → diary → Records → Learn → Me.
# Also checks that nothing on any screen names a brand or a shop, and that the diary's
# "saved" note is the same whatever was logged. Run against `npx vite preview --port 4173`.
import asyncio, os, re
from playwright.async_api import async_playwright
S = os.path.join(os.environ.get("SHOTS", "shots"), "comp-")
BASE = os.environ.get("BASE_URL", "http://localhost:4173/")
BANNED = re.compile(r"\bGC\b|Tooth Mousse|OraNurse|NeutraFluor|Recaldent|Ruscello|Saliva-Check|Colgate|Chemist Warehouse|\bShop\b|\bBuy\b|\$\d", re.I)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await (await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)).new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    seen = []
    async def text(where):
      t = await pg.evaluate("() => document.body.innerText"); seen.append((where, t))
    dlg = pg.get_by_role("dialog"); btn = lambda n: dlg.get_by_role("button", name=n, exact=True)
    await pg.goto(BASE); await pg.wait_for_timeout(500)
    wl = pg.locator(".welcome")
    await text("welcome")
    await wl.get_by_role("button", name="Me", exact=True).click(); await pg.locator(".welcome-foot .btn.primary").click(); await pg.wait_for_timeout(200)
    await text("welcome 2")
    await pg.locator(".welcome-foot .btn.primary").click(); await pg.wait_for_timeout(200)
    await wl.get_by_role("button", name="Cancer treatment").first.click(); await pg.wait_for_timeout(200)
    for _ in range(4):
      f = pg.locator(".welcome-foot .btn.primary")
      if not await f.count(): break
      await text("welcome cancer")
      await wl.get_by_role("button", name="Chemotherapy").first.click() if await wl.get_by_role("button", name="Chemotherapy").count() and not await wl.get_by_role("button", name="Chemotherapy", pressed=True).count() else None
      await f.click(); await pg.wait_for_timeout(300)
    await pg.screenshot(path=S + "1-today-setup.png"); await text("today setup")
    assert await pg.locator(".lite-setup").count() == 1 and await pg.locator(".helpbar").count() == 0
    # 1. Dry mouth score (frequency first)
    await pg.locator(".lite-setup .btn").click(); await pg.wait_for_timeout(300)
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(300)
    await btn("Start").click(); await pg.wait_for_timeout(250)
    for v in ["Often", "Often", "Sometimes", "Often", "Often"]:
      await dlg.get_by_role("button", name=v).first.click(); await pg.wait_for_timeout(350)
    await pg.wait_for_timeout(300); await pg.screenshot(path=S + "2-sip.png"); await text("sip result")
    body = await dlg.inner_text()
    assert "Saved to your records" in body and "saliva gel" not in body.lower()
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
    # 2. Care team (setup title), add the 24-hour line
    assert "Getting started" in await dlg.inner_text()
    await dlg.get_by_label("Phone").first.fill("07 5202 0000")
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
    # 3. Routine: tick two, add one of my own
    await text("routine builder"); await pg.screenshot(path=S + "3-routine.png")
    await dlg.get_by_text("Brush with fluoride toothpaste. Spit, don't rinse").first.click()
    await dlg.get_by_text("Saliva gel before meals").click()
    await dlg.get_by_label("Add your own").fill("Mouthwash from my dentist"); await btn("Add").click()
    await btn("Save").click(); await pg.wait_for_timeout(500)
    await pg.screenshot(path=S + "4-today.png", full_page=True); await text("today")
    assert await pg.locator(".lite-setup").count() == 0 and await pg.locator(".routine").count() == 1
    assert await pg.locator(".helpbar").count() == 1
    assert await pg.locator(".rt-why").count() == 0  # the app never explains "why this is for you"
    # Diary: a severe entry gets the same note as a mild one
    notes = []
    for pain in ["9", "0"]:
      await pg.locator(".log5").click(); await pg.wait_for_timeout(300)
      for k in range(await dlg.locator(".painscale").count()): await dlg.locator(".painscale").nth(k).get_by_role("radio", name=pain, exact=True).click()
      for k in range(await dlg.get_by_role("radiogroup").count()):
        g = dlg.get_by_role("radiogroup").nth(k)
        if not await g.get_by_role("radio", checked=True).count(): await g.get_by_role("radio").first.click()
      grp = dlg.get_by_role("group", name="Anything new with your teeth or gums?")
      if await grp.count(): await grp.get_by_role("button").last.click()
      await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
      notes.append(await dlg.inner_text()); await text(f"diary saved {pain}")
      await pg.screenshot(path=S + f"5-saved-{pain}.png")
      await btn("Done").click(); await pg.wait_for_timeout(250)
    assert notes[0] == notes[1], "the saved note must not depend on what was logged"
    # Records, Learn, Me, When to worry, Call
    for t in ["Records", "Learn"]:
      await pg.click(f'nav >> text="{t}"'); await pg.wait_for_timeout(300)
      await pg.screenshot(path=S + f"6-{t.lower()}.png", full_page=True); await text(t)
    for i in range(await pg.locator(".ctopic-head").count()):
      await pg.locator(".ctopic-head").nth(i).click(); await pg.wait_for_timeout(80)
    await text("learn all open")
    await pg.locator(".help-link", has_text="What to expect").click(); await pg.wait_for_timeout(300); await text("journey"); await pg.screenshot(path=S + "7-journey.png")
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
    await pg.click('nav >> text="Records"'); await pg.wait_for_timeout(200)
    await pg.get_by_role("button", name="Make a summary").click(); await pg.wait_for_timeout(300); await text("summary")
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
    await pg.click('nav >> text="Today"'); await pg.wait_for_timeout(200)
    await pg.get_by_role("button", name="My details").click(); await pg.wait_for_timeout(200)
    await pg.locator(".about summary").click(); await text("me")
    await pg.click('nav >> text="Today"'); await pg.wait_for_timeout(200)
    await pg.locator(".helpbar .help-btn.worry").click(); await pg.wait_for_timeout(300); await text("worry")
    nav = await pg.locator("nav.tabbar").inner_text()
    assert "Shop" not in nav and "Help" not in nav and "Progress" not in nav, nav
    # The one allowed mention: About declares that the author works for GC Australasia.
    seen = [(w, t.replace("He works for GC Australasia, a dental products company. To keep the information independent, Mouthkind names no brands and has no links to buy anything.", "")) for w, t in seen]
    bad = [(w, m.group(0)) for w, t in seen for m in [BANNED.search(t)] if m]
    print("brand or shop wording:", bad or "none")
    print("errors:", errs)
    assert not bad and not errs
    await b.close()

asyncio.run(main())
