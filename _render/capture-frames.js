/**
 * capture-frames.js — Puppeteer Native 1080p Frame Capture
 * 
 * Launches headless Chrome at 1920×1080 (deviceScaleFactor:1),
 * then steps through 120 frames (every 2nd from the 240-frame loop)
 * to capture a perfect, seamless orbital loop at 15fps.
 * 
 * Usage: node capture-frames.js
 * Output: ./frames/frame_0000.png through frame_0119.png
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TOTAL_RENDER_FRAMES = 240; // Original 30fps loop (8 seconds)
const CAPTURE_STEP = 2;          // Every 2nd frame = 120 output frames
const OUTPUT_FRAMES = TOTAL_RENDER_FRAMES / CAPTURE_STEP; // 120
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
    
    // Native 1920×1080 — no DPI upscaling
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
    });

    // Load the render page
    const renderPagePath = path.resolve(__dirname, '..', 'render.html');
    console.log(`Loading ${renderPagePath}...`);
    await page.goto(`file://${renderPagePath}`, { waitUntil: 'networkidle0' });

    // Wait for the page to signal readiness
    await page.waitForFunction('window.__RENDER_READY === true', { timeout: 10000 });
    console.log(`Render page ready. Capturing ${OUTPUT_FRAMES} frames (every ${CAPTURE_STEP}nd from ${TOTAL_RENDER_FRAMES})...`);

    // Allow initial layout to settle
    await page.evaluate(() => { window.renderFrame(0); });
    await new Promise(r => setTimeout(r, 500));

    const startTime = Date.now();
    
    for (let i = 0; i < OUTPUT_FRAMES; i++) {
        const renderIndex = i * CAPTURE_STEP; // 0, 2, 4, ..., 238
        
        // Step the animation to the correct render frame
        await page.evaluate((frameIndex) => {
            window.renderFrame(frameIndex);
        }, renderIndex);

        // Let the browser rasterize SVG filters
        await new Promise(r => setTimeout(r, 100));

        // Capture screenshot at native 1920×1080
        const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
        await page.screenshot({
            path: framePath,
            type: 'png',
            omitBackground: false
        });

        // Progress logging
        if ((i + 1) % 10 === 0 || i === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const eta = ((Date.now() - startTime) / (i + 1) * (OUTPUT_FRAMES - i - 1) / 1000).toFixed(0);
            console.log(`  Frame ${String(i + 1).padStart(3)}/${OUTPUT_FRAMES} captured (${elapsed}s elapsed, ~${eta}s remaining)`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nCapture complete! ${OUTPUT_FRAMES} frames in ${totalTime}s`);
    console.log(`Output: ${FRAMES_DIR}`);
    console.log(`Resolution: 1920×1080 (native)`);

    await browser.close();
})();
