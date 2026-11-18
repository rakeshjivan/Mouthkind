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
    await nxt.click(); await pg.wait_for_timeout(400)
    # decay
    await btn("Yes").click(); await pg.wait_for_timeout(350)
    for t in ["No","Rarely or never"]:
      await dlg.get_by_role("button", name=t).first.click(); await pg.wait_for_timeout(350)
    await dlg.get_by_role("button", name="Twice a day or more").click(); await pg.wait_for_timeout(350)
    await dlg.get_by_role("button", name="Every day").click(); await pg.wait_for_timeout(350)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    await btn("None of these").click(); await pg.wait_for_timeout(250)
    # remaining one-choice questions: dentist etc → pick first option until "None of these" for protect
    for _ in range(4):
      if await dlg.locator(".sheet-foot .btn.primary", has_text="Next:").count(): break
      if await btn("None of these").count(): await btn("None of these").click()
      else: await dlg.locator(".pick-row").first.click()
      await pg.wait_for_timeout(450)
    await pg.screenshot(path=S+"3-decay-result.png")
    nxt=dlg.locator(".sheet-foot .btn.primary"); print("decay next:", await nxt.inner_text())
    await nxt.click(); await pg.wait_for_timeout(400)
    # frequency then SIP
    await pg.screenshot(path=S+"4-freq.png")
    await dlg.locator(".sheet-foot .btn.primary").click(); await pg.wait_for_timeout(300)
    await btn("Start").click(); await pg.wait_for_timeout(250)
    for v in ["Often","Often","Sometimes","Often","Often"]:
      await dlg.get_by_role("button", name=v).first.click(); await pg.wait_for_timeout(350)
    await pg.wait_for_timeout(300); await pg.screenshot(path=S+"5-sip-result.png")
    nxt=dlg.locator(".sheet-foot .btn.primary"); print("sip next:", await nxt.inner_text())
    await nxt.click(); await pg.wait_for_timeout(400)
    await pg.screenshot(path=S+"6-ph.png")
    await dlg.get_by_role("button", name="No strips — skip").click(); await pg.wait_for_timeout(500)
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
    await btn("See my plan").click(); await pg.wait_for_timeout(500)
    await pg.screenshot(path=S+"9-plan.png")
    await pg.click("nav >> text=Home"); await pg.wait_for_timeout(400)
    await pg.screenshot(path=S+"10-home-after.png")
    assert await pg.locator(".focus").count() == 1 and await pg.locator(".ask").count() == 0 and await pg.locator(".setup-card").count() == 0
    assert n >= 1
    print("errors:", errs)
    assert not errs, errs
    await b.close()
asyncio.run(main())
