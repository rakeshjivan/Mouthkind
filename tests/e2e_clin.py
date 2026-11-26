# The clinician-in-the-loop build (src/edition.js = "clinician"), from a fresh install:
# welcome → the questions (dry mouth factors, assessment, team, follow-ups; no decay check) → Today with no plan →
# diary → the clinician view (confirm, review, sign) → Today with the signed plan.
# Checks that no risk band, factor or plan reaches a patient screen before a plan is signed,
# that the diary's note doesn't depend on what was logged, and that findings can be sent.
# Run against `npx vite preview --port 4173`.
import asyncio, os, re
from playwright.async_api import async_playwright
S = os.path.join(os.environ.get("SHOTS", "shots"), "clin-")
BASE = os.environ.get("BASE_URL", "http://localhost:4173/")
# What only the clinician view may show.
ASSESS = re.compile(r"\b(low|moderate|high|very high) risk\b|risk score|risk factor|what adds to your risk|added to your plan|what helps you|your focus|\d+ ?/ ?100", re.I)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    await ctx.add_init_script("window.__shared = []; navigator.share = (d) => { window.__shared.push(d); return Promise.resolve(); };")
    pg = await ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    seen = []
    async def text(where): seen.append((where, await pg.evaluate("() => document.body.innerText")))
    dlg = pg.get_by_role("dialog"); btn = lambda n: dlg.get_by_role("button", name=n, exact=True)
    await pg.goto(BASE); await pg.wait_for_timeout(500)
    wl = pg.locator(".welcome")
    assert await pg.get_by_role("button", name="Skip").count() == 0, "no Skip on the first page"
    await pg.get_by_role("button", name="Get help now").click(); await pg.wait_for_timeout(250)
    assert "000" in await pg.locator(".sheet").inner_text()
    await pg.get_by_role("button", name="Close").last.click(); await pg.wait_for_timeout(200)
    await wl.get_by_role("button", name="Me", exact=True).click(); await pg.locator(".welcome-foot .btn.primary").click(); await pg.wait_for_timeout(200)
    await pg.locator(".welcome-foot .btn.primary").click(); await pg.wait_for_timeout(200)
    await wl.get_by_role("button", name="My medicines are drying my mouth").click(); await pg.locator(".welcome-foot .btn.primary").click(); await pg.wait_for_timeout(400)
    await text("home setup"); await pg.screenshot(path=S + "1-home.png")
    assert "Get your answers ready" in await pg.locator(".setup-card").inner_text()
    assert await pg.locator(".helpbar").count() == 1, "urgent help is reachable during setup"
    await pg.locator(".setup-card .btn").click(); await pg.wait_for_timeout(400)
    # Dry mouth questions
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await dlg.get_by_role("button", name="Bladder urgency or leaking", exact=True).click(); await btn("Next").click(); await pg.wait_for_timeout(250)
    await btn("Skip").click(); await pg.wait_for_timeout(250)
    await dlg.get_by_role("button", name="3 or 4", exact=True).click(); await pg.wait_for_timeout(400)
    for _ in range(3): await btn("None of these").click(); await pg.wait_for_timeout(250)
    await dlg.get_by_role("button", name="6 to 10", exact=True).click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="4 or more", exact=True).click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="Less than 4 glasses", exact=True).click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="65 to 79", exact=True).click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="Woman or female", exact=True).click(); await pg.wait_for_timeout(600)
    await text("risk saved"); await pg.screenshot(path=S + "2-risk-saved.png", full_page=True)
    body = await dlg.inner_text()
    assert "Saved" in body and "for your dentist" not in body and "What can affect a dry mouth" in body, body
    assert "Bladder tablets for urgency or leaking" in body and not re.search(r"\d+ ?pts|/100", body)
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
    # Dry mouth assessment: score and the instrument's band, never called SIP
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(300)
    await btn("Start").click(); await pg.wait_for_timeout(250)
    for i, v in enumerate(["Often", "Often", "Sometimes", "Often", "Often"]):
      if i == 1: await pg.screenshot(path=S + "3a-sip-q.png")
      await dlg.get_by_role("button", name=v).first.click(); await pg.wait_for_timeout(350)
    await pg.wait_for_timeout(300); await text("sip"); await pg.screenshot(path=S + "3-sip.png")
    assert "Saved to your records" in await dlg.inner_text()
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
    # Teeth and gums: no score, answers saved with an explanation each
    assert "tooth decay check" not in (await dlg.inner_text()).lower()
    pick = lambda t: dlg.get_by_role("button", name=t, exact=True)
    await pick("Yes, all or most of them").click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="What Sensitive to hot, cold or sweet means for your mouth", exact=True).click(); await pg.wait_for_timeout(200)
    await pg.screenshot(path=S + "3a-infopop.png"); assert "enamel" in await pg.locator(".infopop").inner_text(); await pg.get_by_role("button", name="Got it").click(); await pg.wait_for_timeout(150)
    await pick("Sensitive to hot, cold or sweet").click(); await btn("Next").click(); await pg.wait_for_timeout(400)
    for t in ["Sometimes", "Twice a day or more", "Yes", "Every day", "Once or twice a day", "Rarely", "In the last year"]:
      await pick(t).first.click(); await pg.wait_for_timeout(400)
    body = await dlg.inner_text(); await pg.screenshot(path=S + "3b-teeth-saved.png", full_page=True)
    assert "Your teeth and gums" in body and not re.search(r"\bpts\b|/100|risk", body, re.I), body
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
    # Care team, then the follow-up questions
    await dlg.get_by_label("Phone").nth(1).fill("07 5444 1234")
    await btn("Save and continue").click(); await pg.wait_for_timeout(500)
    n = 0
    while await dlg.locator(".ask").count() and n < 12:
      a = dlg.locator(".ask"); opt = a.locator(".ask-opt")
      if await opt.count(): await opt.first.click()
      else: await a.locator(".chip").first.click(); await a.get_by_role("button", name="Save").click()
      n += 1; await pg.wait_for_timeout(350)
    await text("setup done"); await pg.screenshot(path=S + "5-done.png")
    assert "All done" in await dlg.inner_text()
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(500)
    # Today before a plan: no routine, no plan-driven alert, the dentist card
    await text("today unsigned"); await pg.screenshot(path=S + "6-today-unsigned.png", full_page=True)
    await pg.evaluate("window.scrollTo(0, 99999); document.querySelectorAll('main, .app').forEach(e => e.scrollTop = 99999)"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=S + "6d-today-bottom.png")
    await pg.evaluate("window.scrollTo(0, 0); document.querySelectorAll('main, .app').forEach(e => e.scrollTop = 0)")
    t0 = await pg.evaluate("document.documentElement.getAttribute('data-theme')")
    await pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); await pg.wait_for_timeout(150)
    await pg.screenshot(path=S + "6b-today-dark.png", full_page=True)
    await pg.evaluate(f"document.documentElement.setAttribute('data-theme','{t0 or 'light'}')")
    assert await pg.locator(".planfrom").count() == 0 and await pg.locator(".routine").count() == 0
    assert await pg.locator(".today-tiles .tt").count() == 8
    assert await pg.locator(".helpbar").count() == 1
    assert "Protect my teeth" in await pg.locator(".tt.t-teeth").inner_text()
    # Diary: mouth questions only, and the same note whatever is logged
    notes = []
    for pain in ["9", "0"]:
      await pg.locator(".tt.t-log").click(); await pg.wait_for_timeout(300)
      body = await dlg.inner_text()
      assert "38°C" not in body and "breathing" not in body.lower(), "the diary asks about the mouth only"
      for k in range(await dlg.locator(".painscale").count()): await dlg.locator(".painscale").nth(k).get_by_role("radio", name=pain, exact=True).click()
      for k in range(await dlg.get_by_role("radiogroup").count()):
        g = dlg.get_by_role("radiogroup").nth(k)
        if not await g.get_by_role("radio", checked=True).count(): await g.get_by_role("radio").last.click() if pain == "9" else await g.get_by_role("radio").first.click()
      grp = dlg.get_by_role("group", name="Anything new with your teeth or gums?")
      if await grp.count(): await grp.get_by_role("button").last.click()
      if pain == "9": await pg.screenshot(path=S + "7-diary.png", full_page=True)
      await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(400)
      notes.append(await dlg.inner_text()); await text(f"diary saved {pain}")
      await btn("Done").click(); await pg.wait_for_timeout(250)
    assert notes[0] == notes[1], "the saved note must not depend on what was logged"
    for t in ["Records", "Learn", "My plan", "Shop"]:
      await pg.click(f'nav >> text="{t}"'); await pg.wait_for_timeout(300); await text(t)
      if t == "Records":
        assert "What can affect a dry mouth" in await pg.locator("main").inner_text()
        recs = await pg.locator("main").inner_text()
        assert not re.search(r"\b(minimal|mild|moderate|severe)\b", recs, re.I), "no severity bands for the patient"
        await pg.locator(".tt.t-sip").click(); await pg.wait_for_timeout(300)
        assert not re.search(r"\b(minimal|mild|moderate|severe)\b", await dlg.inner_text(), re.I)
        await pg.screenshot(path=S + "4f-sip-record.png")
        await dlg.get_by_role("button", name="Close").first.click(); await pg.wait_for_timeout(200)
        await pg.screenshot(path=S + "4-records.png", full_page=True)
      if t == "Shop":
        await pg.screenshot(path=S + "4e-shop.png", full_page=True)
    await pg.click('nav >> text="Learn"'); await pg.wait_for_timeout(200); await text("learn unsigned")
    main = await pg.locator("main").inner_text()
    assert all(x in main for x in ["Start here", "What a dry mouth does", "Protecting your teeth", "Easing the dryness", "What's bothering you?", "Your situation"])
    assert "During cancer treatment" not in main, "cancer topics only in cancer care"
    await pg.get_by_role("button", name=re.compile("Easing the dryness")).click(); await pg.wait_for_timeout(250)
    sheet = await dlg.inner_text()
    assert "6.7" in sheet and "What to look for" in sheet and "See products with these features" in sheet
    await pg.screenshot(path=S + "4b-learn-products.png", full_page=True)
    await dlg.get_by_role("button", name="Close", exact=True).last.click(); await pg.wait_for_timeout(200)
    await pg.screenshot(path=S + "4c-learn.png", full_page=True)
    await pg.click('nav >> text="My plan"'); await pg.wait_for_timeout(200); await text("plan unsigned")
    await pg.screenshot(path=S + "4d-plan-unsigned.png", full_page=True)
    assert "Your plan comes from a health professional" in await pg.locator("main").inner_text()
    sipnames = [w for w, t in seen if re.search(r"\bSIP\b|SIP-SCORE", t)]
    assert not sipnames, f"SIP named on: {sipnames}"
    # A product's own label indication isn't an assessment of this patient.
    LABEL = "Helps prevent tooth decay in people at high risk, as part of a routine your dentist or doctor recommends."
    bad = [(w, m.group(0)) for w, t in seen for m in [ASSESS.search(t.replace(LABEL, ""))] if m]
    print("assessment on patient screens before signing:", bad or "none")
    assert not bad
    # Send my answers
    await pg.click('nav >> text="Today"'); await pg.wait_for_timeout(200)
    await pg.locator(".tt.t-team").click(); await pg.wait_for_timeout(300)
    await pg.screenshot(path=S + "6c-forteam.png")
    await dlg.get_by_role("button", name=re.compile("^Send my answers")).click(); await pg.wait_for_timeout(300)
    shared = await pg.evaluate("window.__shared")
    assert shared and "WHAT CAN AFFECT MY DRY MOUTH" in shared[-1]["text"], shared
    assert not re.search(r"/100|\bpts\b|RISK CHECK|TOOTH DECAY", shared[-1]["text"]), shared[-1]["text"]
    # The clinician view
    await dlg.get_by_role("button", name="Hand my phone to a health professional").click(); await pg.wait_for_timeout(300)
    await pg.screenshot(path=S + "8-confirm.png")
    go = dlg.locator(".sheet-foot .btn.primary")
    await dlg.get_by_label("Your name").fill("Dr Test Smith")
    await dlg.get_by_label("AHPRA registration number").fill("DEN12345"); await dlg.get_by_label("Your name").click()
    await dlg.get_by_role("button", name="I'm a registered health professional reviewing this with the patient", exact=True).click()
    assert await go.is_disabled(), "a malformed AHPRA number must not get through"
    await dlg.get_by_label("AHPRA registration number").fill("DEN0001234567")
    assert not await go.is_disabled()
    await go.click(); await pg.wait_for_timeout(400)
    await pg.screenshot(path=S + "9-clinician.png", full_page=True)
    body = await dlg.inner_text()
    assert "does not replace your clinical judgement" in body and "Dry mouth risk:" in body and "Plan options" in body
    assert await dlg.locator(".clin-table").count() >= 1
    assert await dlg.locator(".clin-opt .pick-row.on").count() == 0, "options must start unticked"
    assert await dlg.get_by_role("button", name="Sign plan").is_disabled()
    print("suggested:", await dlg.locator(".clin-sugg").count(), "of", await dlg.locator(".clin-opt").count())
    for k in range(await dlg.locator(".clin-opt").count()):
      if await dlg.locator(".clin-opt").nth(k).locator(".clin-sugg").count(): await dlg.locator(".clin-opt").nth(k).locator(".pick-row").click()
    await dlg.get_by_label("Note for the patient").fill("Use the gel at night and come back in three months.")
    await dlg.get_by_role("button", name="Sign plan", exact=True).click(); await pg.wait_for_timeout(400)
    assert "Plan saved" in await dlg.inner_text()
    await btn("Hand back").click(); await pg.wait_for_timeout(400)
    # Today with the signed plan
    await pg.screenshot(path=S + "10-today-signed.png", full_page=True)
    pf = await pg.locator(".planfrom").inner_text()
    assert "Your plan from Dr Test Smith" in pf, pf
    assert await pg.locator(".routine").count() == 1
    await pg.click('nav >> text="My plan"'); await pg.wait_for_timeout(300)
    await pg.screenshot(path=S + "10b-plan-signed.png", full_page=True)
    assert await pg.locator(".pitem").count() >= 1
    await pg.click('nav >> text="Learn"'); await pg.wait_for_timeout(200)
    await pg.screenshot(path=S + "11-learn.png", full_page=True)
    print("learn heading:", "Suggested in your plan" in await pg.locator("main").inner_text())
    assert await pg.locator(".help-links").count() == 0, "Learn starts at Start here, without the help links"
    nav = await pg.locator("nav.tabbar").inner_text()
    assert all(x in nav for x in ["Today", "Records", "Learn", "My plan", "Shop"]) and "Help" not in nav and "Diary" not in nav, nav
    # Care team: dentist and pharmacy can each be searched for near a postcode
    await pg.click('nav >> text="Today"'); await pg.wait_for_timeout(200)
    await pg.locator(".tt.t-team").click(); await pg.wait_for_timeout(300)
    await dlg.get_by_role("button", name=re.compile("^My care team's details")).click(); await pg.wait_for_timeout(300)
    for w in ["dentist", "pharmacy"]: assert await dlg.get_by_role("button", name=f"Find a {w} near me").count() == 1, w
    await dlg.get_by_role("button", name="Find a pharmacy near me").click(); await pg.wait_for_timeout(150)
    await dlg.get_by_label("Your postcode").last.fill("4558")
    assert "Show pharmacies near 4558" in await dlg.inner_text()
    await pg.screenshot(path=S + "12-careteam.png", full_page=True)
    await dlg.get_by_role("button", name="Close").first.click(); await pg.wait_for_timeout(200)
    await pg.locator(".me-avatar").click(); await pg.wait_for_timeout(300)
    await pg.screenshot(path=S + "13-me.png", full_page=True)
    print("errors:", errs)
    assert not errs
    await b.close()

asyncio.run(main())
