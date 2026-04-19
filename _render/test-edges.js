/**
 * test-edges.js — Edge sharpness verification for the sprite sheet
 * 
 * Verifies that:
 *   1. All 120 cells have content (not blank/black)
 *   2. Cell boundaries are pixel-perfect (no bleed between cells)
 *   3. The padding rows/columns between cells are pure black (#000)
 *   4. Frame-to-frame variation exists (animation isn't frozen)
 */

const sharp = require('sharp');
const path = require('path');

const SPRITE_PATH = path.join(__dirname, '..', 'background_sprite.webp');
const COLS = 8, ROWS = 15, TOTAL = 120;
const CELL_W = 1920, CELL_H = 1080, PAD = 4;

(async () => {
    console.log('Loading sprite sheet...');
    const meta = await sharp(SPRITE_PATH).metadata();
    
    const expectedW = COLS * CELL_W + (COLS - 1) * PAD;
    const expectedH = ROWS * CELL_H + (ROWS - 1) * PAD;
    
    console.log(`Image dimensions: ${meta.width}×${meta.height}`);
    console.log(`Expected dimensions: ${expectedW}×${expectedH}`);
    
    if (meta.width !== expectedW || meta.height !== expectedH) {
        console.error('❌ FAIL: Dimensions mismatch!');
        process.exit(1);
    }
    console.log('✅ Dimensions correct\n');
    
    // Extract raw pixel buffer
    const { data: pixels, info } = await sharp(SPRITE_PATH)
        .raw()
        .toBuffer({ resolveWithObject: true });
    
    const channels = info.channels;
    const width = info.width;
    
    function getPixel(x, y) {
        const idx = (y * width + x) * channels;
        return [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
    }
    
    let passCount = 0;
    let failCount = 0;
    
    // ─── Test 1: Cell content verification ───────────────────────────
    console.log('Test 1: Checking all 120 cells have content...');
    const cellHashes = [];
    let blankCells = 0;
    
    for (let i = 0; i < TOTAL; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const sx = col * (CELL_W + PAD);
        const sy = row * (CELL_H + PAD);
        
        // Sample center pixel of each cell
        const centerX = sx + Math.floor(CELL_W / 2);
        const centerY = sy + Math.floor(CELL_H / 2);
        const pixel = getPixel(centerX, centerY);
        
        // Compute rough hash from several sample points
        let hash = 0;
        for (let s = 0; s < 8; s++) {
            const sampleX = sx + Math.floor(CELL_W * (s + 1) / 9);
            const sampleY = sy + Math.floor(CELL_H / 2);
            const p = getPixel(sampleX, sampleY);
            hash += p[0] + p[1] * 256 + p[2] * 65536;
        }
        cellHashes.push(hash);
        
        if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
            console.error(`  ❌ Frame ${i} (row ${row}, col ${col}): center pixel is black — possibly blank`);
            blankCells++;
            failCount++;
        }
    }
    
    if (blankCells === 0) {
        console.log(`  ✅ All ${TOTAL} cells have content`);
        passCount++;
    }
    
    // ─── Test 2: Frame variation ─────────────────────────────────────
    console.log('\nTest 2: Checking frame-to-frame variation...');
    const uniqueHashes = new Set(cellHashes);
    if (uniqueHashes.size < TOTAL * 0.5) {
        console.error(`  ❌ Only ${uniqueHashes.size} unique frames out of ${TOTAL}`);
        failCount++;
    } else {
        console.log(`  ✅ ${uniqueHashes.size} unique frame signatures detected`);
        passCount++;
    }
    
    // ─── Test 3: Padding columns are black ───────────────────────────
    console.log('\nTest 3: Verifying padding columns between cells...');
    let padColErrors = 0;
    
    for (let col = 0; col < COLS - 1; col++) {
        const padX = (col + 1) * CELL_W + col * PAD;
        for (let s = 0; s < 20; s++) {
            const sampleY = Math.floor(s * (info.height - 1) / 19);
            for (let px = 0; px < PAD; px++) {
                const pixel = getPixel(padX + px, sampleY);
                if (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0) {
                    padColErrors++;
                }
            }
        }
    }
    
    if (padColErrors > 0) {
        console.error(`  ⚠️ ${padColErrors} non-black pixels in column padding (bleed detected)`);
        failCount++;
    } else {
        console.log('  ✅ All padding columns are clean black');
        passCount++;
    }
    
    // ─── Test 4: Padding rows are black ──────────────────────────────
    console.log('\nTest 4: Verifying padding rows between cells...');
    let padRowErrors = 0;
    
    for (let row = 0; row < ROWS - 1; row++) {
        const padY = (row + 1) * CELL_H + row * PAD;
        for (let s = 0; s < 20; s++) {
            const sampleX = Math.floor(s * (info.width - 1) / 19);
            for (let py = 0; py < PAD; py++) {
                const pixel = getPixel(sampleX, padY + py);
                if (pixel[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0) {
                    padRowErrors++;
                }
            }
        }
    }
    
    if (padRowErrors > 0) {
        console.error(`  ⚠️ ${padRowErrors} non-black pixels in row padding (bleed detected)`);
        failCount++;
    } else {
        console.log('  ✅ All padding rows are clean black');
        passCount++;
    }
    
    // ─── Test 5: Background color check ──────────────────────────────
    console.log('\nTest 5: Checking frame corners match background #002E51...');
    const BG_R = 0x00, BG_G = 0x2E, BG_B = 0x51;
    let bgCheckPassed = 0;
    
    for (const frameIdx of [0, TOTAL - 1]) {
        const col = frameIdx % COLS;
        const row = Math.floor(frameIdx / COLS);
        const sx = col * (CELL_W + PAD);
        const sy = row * (CELL_H + PAD);
        
        const tlPixel = getPixel(sx + 2, sy + 2);
        const dr = Math.abs(tlPixel[0] - BG_R);
        const dg = Math.abs(tlPixel[1] - BG_G);
        const db = Math.abs(tlPixel[2] - BG_B);
        
        if (dr < 10 && dg < 10 && db < 10) {
            bgCheckPassed++;
        } else {
            console.log(`  ⚠️ Frame ${frameIdx} corner: rgb(${tlPixel.join(',')}) — expected near #002E51`);
        }
    }
    
    if (bgCheckPassed >= 2) {
        console.log('  ✅ Frame corners match background color');
        passCount++;
    } else {
        console.log('  ⚠️ Some corners deviate from expected background');
    }
    
    // ─── Summary ─────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(50)}`);
    if (failCount === 0) {
        console.log(`✅ ALL TESTS PASSED (${passCount} checks)`);
    } else {
        console.log(`⚠️ ${failCount} issue(s) found, ${passCount} checks passed`);
    }
    console.log(`${'═'.repeat(50)}`);
    
    process.exit(failCount > 0 ? 1 : 0);
})();
