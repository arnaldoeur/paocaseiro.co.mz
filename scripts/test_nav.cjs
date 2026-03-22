const { chromium } = require('playwright');

(async () => {
    console.log("Starting browser...");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });
    
    page.on('pageerror', error => {
        console.log('PAGE ERROR:', error.message);
    });

    console.log("Navigating to /blog...");
    await page.goto('http://localhost:3001/blog');
    
    await page.waitForTimeout(2000); // let things settle
    console.log("Clicking the logo to go home...");
    
    await page.click('img[alt="Pão Caseiro Logo"]');
    
    await page.waitForTimeout(3000);
    console.log("Current URL:", page.url());
    
    await browser.close();
})();
