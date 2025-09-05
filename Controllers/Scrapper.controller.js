const { chromium } = require("playwright");
const categories = ["Restaurants"];

const FEED = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd[role="feed"]';
const CARD = '.Nv2PK.THOPZb:has(> a.hfpxzc)';
const { cloudinary, uploadBufferToCloudinary } = require("../Configurations/Cloudinary.config")
const nowStamp = () => new Date().toISOString().replace(/[:.]/g, '-');



const Scrapper_google_bot = async (req, res) => {
  console.log("Enter");

  const arr = req.body[0].queries;

  const firstfive = arr.slice(0, 5)

  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.google.com/maps?hl=en&gl=US', { waitUntil: 'domcontentloaded' });

    const buffer = await page.screenshot({ path: 'Screenshoots/screenshot-before-boxinut.png' });

    const res5 = await uploadBufferToCloudinary(buffer, {
      folder: 'Screenshoots',
      public_id: `screenshot-first-boxinut${new Date()}.png`,
      tags: ['playwright', 'env:prod'],
      context: { page: 'home', suite: 'smoke' },
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    async function acceptGoogleConsentEnglish(page) {

      const buffer = await page.screenshot({ path: 'Screenshoots/acceptGoogleConsentEnglish-boxinut.png' });

      const res = await uploadBufferToCloudinary(buffer, {
        folder: 'Screenshoots',
        public_id: `acceptGoogleConsentEnglish${new Date()}.png`,
        tags: ['playwright', 'env:prod'],
        context: { page: 'home', suite: 'smoke' },
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      // Heading on EN page: "Before you continue to Google"
      const isConsentEN =
        (await page.getByText(/Before you continue to Google/i).count()) > 0 ||
        /consent\.google\.com/i.test(page.url());

      if (!isConsentEN) return; // not the EN consent page

      // try top-level page first
      const acceptBtnTop = page.getByRole('button', { name: /^Accept all$/i });
      if (await acceptBtnTop.count()) {
        await acceptBtnTop.first().click().catch(() => { });
        await page.waitForLoadState('domcontentloaded').catch(() => { });
        return;
      }

      // fallback: sometimes in an iframe from consent.google.com
      const consentFrame = page.frames().find(f => /consent\.google\.com/i.test(f.url()));
      if (consentFrame) {
        const acceptBtnFrame = consentFrame.getByRole('button', { name: /^Accept all$/i });
        if (await acceptBtnFrame.count()) {
          await acceptBtnFrame.first().click().catch(() => { });
          await page.waitForLoadState('domcontentloaded').catch(() => { });
        }
      }
    }

    acceptGoogleConsentEnglish(page)

    if (!/google\.com\/maps/i.test(page.url())) {
      await page.goto('https://www.google.com/maps?hl=en&gl=US', { waitUntil: 'domcontentloaded' });
    }

    const buffer2 = await page.screenshot({ path: 'Screenshoots/screenshot-before-boxinut.png' });

    const res2 = await uploadBufferToCloudinary(buffer, {
      folder: 'Screenshoots',
      public_id: `wtf${new Date()}.png`,
      tags: ['playwright', 'env:prod'],
      context: { page: 'home', suite: 'smoke' },
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

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

      const nameLoc = p.locator('h1.DUwDvf.lfPIob');
      await nameLoc.waitFor({ state: "visible", timeout: 150000 }).catch(() => { });
      const name = await nameLoc.innerText().catch(() => '');
      // await page.screenshot({ path: `Screenshoots/screenshot-${nameLoc}.png` });


      const phoneLoc = p.locator('button[data-item-id*="phone:tel"]');
      await phoneLoc.waitFor({ state: "attached", timeout: 100000 }).catch(() => { });
      const phone = await phoneLoc.innerText().catch(() => '');
      // await page.screenshot({ path: `Screenshoots/screenshot-${phoneLoc}.png` });


      const addressLoc = p.locator('.Io6YTe.fontBodyMedium.kR99db').first();
      await addressLoc.waitFor({ state: "attached", timeout: 100000 }).catch(() => { });
      const address = await addressLoc.innerText().catch(() => '');

      const websiteLoc = p.locator('a[data-item-id*="authority"]');
      await websiteLoc.waitFor({ state: "attached", timeout: 100000 }).catch(() => { });
      const website = await websiteLoc.getAttribute('href').catch(() => '');

      await p.close();
      console.log(name, phone, address, website, href)
      return { name, phone, address, website, link: href };
    }

    const results = [];

    for (const cat of firstfive) {
      const buffer = await page.screenshot({ path: 'Screenshoots/screenshot-before-boxinut.png' });

      const res7 = await uploadBufferToCloudinary(buffer, {
        folder: 'Screenshoots',
        public_id: `screenshot-before-boxinut.png`,
        tags: ['playwright', 'env:prod'],
        context: { page: 'home', suite: 'smoke' },
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });

      const searchBox = page.locator(".searchboxinput");
      await searchBox.waitFor({ state: "visible", timeout: 100000 });
      await searchBox.click();
      await searchBox.fill(`${cat} in USA`);
      const buffer2 = await page.screenshot({ path: 'Screenshoots/screenshot-after-boxinut.png' });


      const res10 = await uploadBufferToCloudinary(buffer2, {
        folder: 'Screenshoots',
        public_id: `screenshot-after-boxinut.png`,
        tags: ['playwright', 'env:prod'],
        context: { page: 'home', suite: 'smoke' },
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });


      await searchBox.press("Enter");

      const feedLoc = page.locator(FEED);
      await feedLoc.waitFor({ state: "visible", timeout: 300000 });

      console.log(`Processing : ${cat}`);
      await scrollFeed(4, 1000, 250);

      const hrefs = await getUpToTargetHrefs(50);

      for (const href of hrefs) {
        const rec = await scrapeHref(href);
        results.push({ category: cat, ...rec });
      }
    }

    await browser.close();
    console.log("End");
    return res.status(200).json({ ok: true, total: results.length, results });
  } catch (err) {
    if (browser) await browser.close().catch(() => { });
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error" });
  }
};

module.exports = {
  Scrapper_google_bot
};
