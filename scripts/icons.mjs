import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const svg=await readFile('public/icons/icon.svg','utf8');
const browser=await chromium.launch({channel:process.env.COPILOT_BROWSER_PATH?undefined:'msedge',executablePath:process.env.COPILOT_BROWSER_PATH});
try {
  const page=await browser.newPage();
  for(const size of [16,32,48,128]) {
    await page.setViewportSize({width:size,height:size});
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    await page.screenshot({path:`public/icons/icon-${size}.png`,omitBackground:true});
  }
} finally {await browser.close();}
