/**
 * build-spritesheet.js — Generate a 10×12 grid sprite sheet from captured frames
 * 
 * Takes 120 captured frames (frame_0000..frame_0119), scales each to 1280×720,
 * and tiles them in a 10-column × 12-row grid with 4px padding between cells.
 * 
 * Uses a two-pass approach to avoid command-line length limits on Windows:
 *   Pass 1: Build 12 horizontal row strips (10 frames per row)
 *   Pass 2: Stack all 12 row strips vertically into the final grid
 * 
 * Output format matches what script.js expects:
 *   COLS=10, ROWS=12, TOTAL=120, CELL_W=1280, CELL_H=720, PAD=4
 * 
 * Output: ../background_sprite.webp
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FRAMES_DIR = path.join(__dirname, 'frames');
const TEMP_DIR = path.join(__dirname, 'temp_rows');
const OUTPUT = path.join(__dirname, '..', 'background_sprite.webp');

// Grid configuration — must match script.js sprite driver
const COLS = 10;
const ROWS = 12;
const TOTAL_FRAMES = 120;
const CELL_W = 1280;
const CELL_H = 720;
const PAD = 4;

// Verify all frames exist
const missingFrames = [];
for (let i = 0; i < TOTAL_FRAMES; i++) {
    const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`);
    if (!fs.existsSync(framePath)) missingFrames.push(i);
}

if (missingFrames.length > 0) {
    console.error(`Missing ${missingFrames.length} frames: ${missingFrames.slice(0, 10).join(', ')}${missingFrames.length > 10 ? '...' : ''}`);
    console.error('Run capture-frames.js first.');
    process.exit(1);
}

// Clean and create temp directory
if (fs.existsSync(TEMP_DIR)) {
    fs.readdirSync(TEMP_DIR).forEach(f => fs.unlinkSync(path.join(TEMP_DIR, f)));
} else {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const ffmpegEnv = { ...process.env, Path: [
    process.env.Path,
    'C:\\Users\\julia\\AppData\\Local\\Microsoft\\WinGet\\Links'
].join(';')};

console.log(`Building sprite sheet: ${TOTAL_FRAMES} frames in ${COLS}×${ROWS} grid`);
console.log(`Cell size: ${CELL_W}×${CELL_H}, Padding: ${PAD}px`);

// ─── PASS 1: Build horizontal row strips ─────────────────────────────
console.log(`\nPass 1: Building ${ROWS} row strips (${COLS} frames each)...`);

for (let row = 0; row < ROWS; row++) {
    const startFrame = row * COLS;
    const inputs = [];
    const scales = [];
    
    for (let col = 0; col < COLS; col++) {
        const frameIdx = startFrame + col;
        const framePath = path.join(FRAMES_DIR, `frame_${String(frameIdx).padStart(4, '0')}.png`);
        inputs.push(`-i "${framePath}"`);
        scales.push(`[${col}:v]scale=${CELL_W}:${CELL_H}:flags=lanczos[s${col}]`);
    }
    
    const hstackInputs = Array.from({ length: COLS }, (_, i) => `[s${i}]`).join('');
    const rowOutput = path.join(TEMP_DIR, `row_${String(row).padStart(2, '0')}.png`);
    
    // Use xstack with horizontal layout and PAD gaps
    const layoutParts = [];
    for (let col = 0; col < COLS; col++) {
        layoutParts.push(`${col * (CELL_W + PAD)}_0`);
    }
    const layout = layoutParts.join('|');
    const rowWidth = COLS * CELL_W + (COLS - 1) * PAD;
    
    const cmd = [
        'ffmpeg -y',
        inputs.join(' '),
        `-filter_complex "${scales.join(';')};`,
        `${hstackInputs}xstack=inputs=${COLS}:layout=${layout}:fill=black[out]"`,
        '-map "[out]"',
        '-frames:v 1',
        `-c:v png "${rowOutput}"`
    ].join(' ');
    
    execSync(cmd, { stdio: 'pipe', maxBuffer: 1024 * 1024 * 50, env: ffmpegEnv });
    console.log(`  Row ${row + 1}/${ROWS} built`);
}

// ─── PASS 2: Stack all rows vertically ───────────────────────────────
console.log(`\nPass 2: Stacking ${ROWS} rows vertically...`);

const rowInputs = [];
const rowScales = [];
const vstackLayoutParts = [];

for (let row = 0; row < ROWS; row++) {
    const rowPath = path.join(TEMP_DIR, `row_${String(row).padStart(2, '0')}.png`);
    rowInputs.push(`-i "${rowPath}"`);
    rowScales.push(`[${row}:v]copy[r${row}]`);
    vstackLayoutParts.push(`0_${row * (CELL_H + PAD)}`);
}

const vstackInputs = Array.from({ length: ROWS }, (_, i) => `[r${i}]`).join('');
const vstackLayout = vstackLayoutParts.join('|');

const finalCmd = [
    'ffmpeg -y',
    rowInputs.join(' '),
    `-filter_complex "${rowScales.join(';')};`,
    `${vstackInputs}xstack=inputs=${ROWS}:layout=${vstackLayout}:fill=black[out]"`,
    '-map "[out]"',
    '-frames:v 1',
    '-c:v libwebp -lossless 1 -compression_level 6',
    `"${OUTPUT}"`
].join(' ');

execSync(finalCmd, { stdio: 'pipe', maxBuffer: 1024 * 1024 * 100, env: ffmpegEnv });

// Cleanup temp files
console.log('\nCleaning up temporary row files...');
fs.readdirSync(TEMP_DIR).forEach(f => fs.unlinkSync(path.join(TEMP_DIR, f)));
fs.rmdirSync(TEMP_DIR);

const stats = fs.statSync(OUTPUT);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
const SPRITE_W = COLS * CELL_W + (COLS - 1) * PAD;
const SPRITE_H = ROWS * CELL_H + (ROWS - 1) * PAD;

console.log(`\nSprite sheet saved: ${OUTPUT}`);
console.log(`File size: ${sizeMB} MB`);
console.log(`Grid: ${COLS}×${ROWS} = ${TOTAL_FRAMES} frames`);
console.log(`Cell: ${CELL_W}×${CELL_H} + ${PAD}px padding`);
console.log(`Canvas: ${SPRITE_W}×${SPRITE_H}`);
