/**
 * capture-frames.js — Puppeteer 4K Frame Capture
 * 
 * Launches headless Chrome at 1920×1080 with deviceScaleFactor:2
 * (producing 3840×2160 screenshots), then steps through 240 deterministic
 * frames to capture a perfect, seamless orbital loop.
 * 
 * Usage: node capture-frames.js
 * Output: ./frames/frame_0000.png through frame_0239.png
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TOTAL_FRAMES = 240;
const FRAMES_DIR = path.join(__dirname, 'frames');

(async () => {
    // Ensure frames directory exists and is clean
    if (fs.existsSync(FRAMES_DIR)) {
        const existing = fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith('.png'));
        if (existing.length > 0) {
            console.log(`Cleaning ${existing.length} existing frames...`);
            existing.forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
        }
    } else {
        fs.mkdirSync(FRAMES_DIR, { recursive: true });
    }

    console.log('Launching headless Chrome...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu-sandbox',
            '--enable-gpu-rasterization',
            '--force-gpu-mem-available-mb=1024'
        ]
    });

    const page = await browser.newPage();
    
    // Set viewport to 1920×1080 at 2x device scale = 3840×2160 pixel output
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2
    });

    // Load the render page
    const renderPagePath = path.resolve(__dirname, '..', 'render.html');
    console.log(`Loading ${renderPagePath}...`);
    await page.goto(`file://${renderPagePath}`, { waitUntil: 'networkidle0' });

    // Wait for the page to signal readiness
    await page.waitForFunction('window.__RENDER_READY === true', { timeout: 10000 });
    console.log('Render page ready. Starting frame capture...');

    // Allow initial layout to settle
    await page.evaluate(() => {
        // Force layout recalculation
        window.renderFrame(0);
    });
    await new Promise(r => setTimeout(r, 500));

    const startTime = Date.now();
    
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        // Step the animation to frame i
        await page.evaluate((frameIndex) => {
            window.renderFrame(frameIndex);
        }, i);

        // Small delay to let the browser rasterize SVG filters
        await new Promise(r => setTimeout(r, 100));

        // Capture screenshot
        const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
        await page.screenshot({
            path: framePath,
            type: 'png',
            omitBackground: false
        });

        // Progress logging
        if ((i + 1) % 10 === 0 || i === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const eta = ((Date.now() - startTime) / (i + 1) * (TOTAL_FRAMES - i - 1) / 1000).toFixed(0);
            console.log(`  Frame ${String(i + 1).padStart(3)}/${TOTAL_FRAMES} captured (${elapsed}s elapsed, ~${eta}s remaining)`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nCapture complete! ${TOTAL_FRAMES} frames in ${totalTime}s`);
    console.log(`Output: ${FRAMES_DIR}`);

    await browser.close();
})();
