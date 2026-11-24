# The build-your-plan flow from a fresh install: every step in order, then the plan.
# Run against `npx vite preview --port 4173`.
import asyncio
from playwright.async_api import async_playwright
import os
S=os.path.join(os.environ.get("SHOTS", "shots"), "flow-")
BASE=os.environ.get("BASE_URL", "http://localhost:4173/")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); pg=await (await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2)).new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    dlg=pg.get_by_role("dialog"); btn=lambda n: dlg.get_by_role("button", name=n, exact=True)
    await pg.goto(BASE); await pg.wait_for_timeout(500)
    wl=pg.locator(".welcome")
    await wl.get_by_role("button", name="Myself").click(); await pg.locator(".welcome-foot button").click(); await pg.wait_for_timeout(200)
    await pg.locator(".welcome-foot button").click(); await pg.wait_for_timeout(200)  # about you
    await wl.get_by_role("button", name="Medicines that dry my mouth").click(); await pg.locator(".welcome-foot button").click(); await pg.wait_for_timeout(400)
    await pg.screenshot(path=S+"1-home.png")
    assert await pg.locator(".setup-card").count()==1 and await pg.locator(".focus").count()==0 and await pg.locator(".ask").count()==0
    await pg.locator(".setup-card .btn").click(); await pg.wait_for_timeout(400)
    # risk: conditions → none; medFor bladder → next; names skip; count 3 or 4; treatments none; breathing none; habits none; water; age; gender
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await dlg.get_by_role("button", name="Bladder urgency or leaking").click(); await btn("Next").click(); await pg.wait_for_timeout(250)
    await btn("Skip").click(); await pg.wait_for_timeout(250)
    await dlg.get_by_role("button", name="3 or 4").click(); await pg.wait_for_timeout(400)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await dlg.get_by_role("button", name="Less than 4 glasses").click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="65 to 79").click(); await pg.wait_for_timeout(400)
    await dlg.get_by_role("button", name="Woman or female").click(); await pg.wait_for_timeout(600)
    await pg.screenshot(path=S+"2-risk-result.png")
    nxt=dlg.locator(".sheet-foot .btn.primary"); print("risk next:", await nxt.inner_text())
    assert "Dry mouth score" in await nxt.inner_text()
    await nxt.click(); await pg.wait_for_timeout(400)
    # frequency then SIP
    await pg.screenshot(path=S+"4-freq.png")
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(300)
    await btn("Start").click(); await pg.wait_for_timeout(250)
    for v in ["Often","Often","Sometimes","Often","Often"]:
      await dlg.get_by_role("button", name=v).first.click(); await pg.wait_for_timeout(350)
    await pg.wait_for_timeout(300); await pg.screenshot(path=S+"5-sip-result.png")
    nxt=dlg.locator(".sheet-foot .btn.primary"); print("sip next:", await nxt.inner_text())
    assert "decay" in (await nxt.inner_text()).lower()
    await nxt.click(); await pg.wait_for_timeout(400)
    # tooth decay check (dry mouth and age already known)
    pick=lambda t: dlg.get_by_role("button", name=t)
    await btn("Yes").click(); await pg.wait_for_timeout(350)
    await pick("Yes, once").click(); await pg.wait_for_timeout(350)
    await pick("3 or more times a day").click(); await pg.wait_for_timeout(350)
    await btn("Once a day").click(); await pg.wait_for_timeout(350)
    await pick("Sometimes").click(); await pg.wait_for_timeout(350)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await pick("1 to 2 years ago").click(); await pg.wait_for_timeout(350)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    if await btn("See my result").count(): await btn("See my result").click()
    await pg.wait_for_timeout(600); await pg.screenshot(path=S+"5b-decay-result.png")
    nxt=dlg.locator(".sheet-foot .btn.primary"); print("decay next:", await nxt.inner_text())
    assert "Care team" in await nxt.inner_text()
    await nxt.click(); await pg.wait_for_timeout(400)
    await pg.screenshot(path=S+"6-team.png")
    await dlg.get_by_label("Phone").nth(1).fill("07 5444 1234")
    await btn("Save and continue").click(); await pg.wait_for_timeout(500)
    await pg.screenshot(path=S+"7-questions.png")
    n=0
    while await dlg.locator(".ask").count() and n<12:
      a=dlg.locator(".ask")
      opt=a.locator(".ask-opt")
      if await opt.count(): await opt.first.click()
      else:
        await a.locator(".chip").first.click(); await a.get_by_role("button", name="Save").click()
      n+=1; await pg.wait_for_timeout(350)
    print("questions answered:", n)
    await pg.screenshot(path=S+"8-ready.png")
    ready=dlg.locator(".sheet-foot .btn.primary"); print("ready:", await ready.inner_text())
    await ready.click(); await pg.wait_for_timeout(500)
    # Setup ends on Today: the routine, the log button and the help bar
    await pg.screenshot(path=S+"10-today.png", full_page=True)
    assert await pg.locator(".routine").count() == 1 and await pg.locator(".rt-slot.now").count() == 1
    assert await pg.locator(".log5").count() == 1 and await pg.locator(".setup-card").count() == 0 and await pg.locator(".ask").count() == 0
    assert await pg.locator(".helpbar a.help-btn.call").get_attribute("href") == "tel:0754441234"
    # Ticking an item counts it and survives a reload
    first=pg.locator(".rt-slot.now .rt-item input").first
    await first.check(); await pg.wait_for_timeout(200); await pg.reload(); await pg.wait_for_timeout(400)
    assert await pg.locator(".rt-slot.now .rt-item input").first.is_checked()
    await pg.locator(".helpbar .help-btn.worry").click(); await pg.wait_for_timeout(300)
    assert await dlg.get_by_text("Call 000").count() >= 1 and await dlg.locator(".team-list li").count() == 1
    await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
    assert n >= 1
    print("errors:", errs)
    assert not errs, errs
    await b.close()
asyncio.run(main())
