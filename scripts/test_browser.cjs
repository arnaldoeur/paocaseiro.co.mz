const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Important: Listen to all console events and network responses!
  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`[BRW-CONSOLE] ${msg.args()[i]}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`[BRW-REQ-FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/whatsapp')) {
      console.log(`[BRW-API] WhatsApp Response: ${response.status()}`);
      try {
        const text = await response.text();
        console.log(`[BRW-API-BODY] ${text}`);
      } catch(e) {}
    }
  });

  try {
    console.log("Navigating to http://localhost:3000");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    console.log("Waiting for 'Entrar' button...");
    await page.waitForXPath("//button[contains(., 'Entrar')]", { timeout: 10000 });
    const [loginBtn] = await page.$x("//button[contains(., 'Entrar')]");
    
    console.log("Clicking 'Entrar'...");
    await loginBtn.click();
    
    console.log("Waiting for phone input...");
    // The input has placeholder "Seu número (Ex: 84...)"
    await page.waitForSelector('input[placeholder*="84"]');
    await page.type('input[placeholder*="84"]', '258863242532');
    
    console.log("Clicking 'AVANÇAR'...");
    const [nextBtn] = await page.$x("//button[contains(., 'AVANÇAR') or contains(., 'CONTINUAR')]");
    if (nextBtn) {
      await nextBtn.click();
    } else {
      console.log("No next button found!");
    }
    
    console.log("Waiting 5 seconds for OTP network request and console logs...");
    await new Promise(r => setTimeout(r, 5000));
    
  } catch (error) {
    console.error("Puppeteer Error:", error);
  } finally {
    await browser.close();
  }
})();
