const {chromium} = require("playwright")
const categories = ["Restaurants", "Salons", "Gyms", "Contractors", "Auto Repair", "Clinics"];

const FEED = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[role="feed"]';
const CARD = '.Nv2PK.THOPZb:has(> a.hfpxzc)';

 const Scrapper_google_bot = async (req, res) => {
  console.log("Enter")
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("https://www.google.com/maps");

    async function scrollFeed(times = 8, px = 1000, delayMs = 300) {
      await page.evaluate(async ({ FEED, times, px, delayMs }) => {
        const el = document.querySelector(FEED);
        if (!el) return;
        for (let i = 0; i < times; i++) {
          el.scrollBy(0, px);
          // @ts-ignore
          await new Promise(r => setTimeout(r, delayMs));
        }
      }, { FEED, times, px, delayMs });
    }

    async function collectHrefs() {
      return await page
        .locator(`${FEED} ${CARD} a.hfpxzc`)
        .evaluateAll(a => a.map(x => x.getAttribute('href') || '').filter(Boolean));
    }

    async function getUpToTargetHrefs(target) {
      const seen = new Set();
      let lastCount = -1;
      while (seen.size < target) {
        const hrefs = await collectHrefs();
        hrefs.forEach(h => seen.add(h));
        if (seen.size >= target) break;
        if (seen.size === lastCount) break;
        lastCount = seen.size;
        await scrollFeed(8, 1200, 250);
      }
      return Array.from(seen).slice(0, target);
    }

    async function scrapeHref(href) {
      const p = await context.newPage();
      await p.goto(href, { waitUntil: "domcontentloaded" });

      const name    = await p.locator('h1.DUwDvf.lfPIob').innerText().catch(() => '');
      const phone   = await p.locator('button[data-item-id*="phone:tel"]').innerText().catch(() => '');
      const address = await p.locator('.Io6YTe.fontBodyMedium.kR99db').first().innerText().catch(() => '');
      const website = await p.locator('a[data-item-id*="authority"]').getAttribute('href').catch(() => '');

      await p.close();
      return { name, phone, address, website, link: href };
    }

    const results = [];

    for (const cat of categories) {
      const searchBox = page.locator(".searchboxinput");
      await searchBox.click();
      await searchBox.fill(`${cat} in USA`);
      await searchBox.press("Enter");

      await page.locator(FEED).waitFor();
      console.log(`Processing : ${cat}`)
      await scrollFeed(4, 1000, 250);

      const hrefs = await getUpToTargetHrefs(50);

      for (const href of hrefs) {
        const rec = await scrapeHref(href);
        results.push({ category: cat, ...rec });
      }
    }

    await browser.close();
    console.log("End")
    return res.status(200).json({ ok: true, total: results.length, results });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};



module.exports = {
    Scrapper_google_bot
}