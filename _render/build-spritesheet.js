/**
 * build-spritesheet.js — Generate a CSS sprite sheet from captured frames
 * 
 * Takes every Nth frame, scales down, and tiles them into a single horizontal
 * strip image. The CSS animation uses background-position + steps() to cycle
 * through frames with zero JS, zero video decode, and minimal GPU cost.
 * 
 * Output: ../background_sprite.webp
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FRAMES_DIR = path.join(__dirname, 'frames');
const OUTPUT = path.join(__dirname, '..', 'background_sprite.webp');

// Configuration
const FRAME_STEP = 5;     // Take every 5th frame (240/5 = 48 frames)
const FRAME_W = 480;      // Each frame width (blurry content — this is plenty)
const FRAME_H = 270;      // Each frame height (16:9)
const TOTAL_FRAMES = 240;

// Build list of frames to use
const selectedFrames = [];
for (let i = 0; i < TOTAL_FRAMES; i += FRAME_STEP) {
    selectedFrames.push(path.join(FRAMES_DIR, `frame_${String(i).padStart(4, '0')}.png`));
}

const SPRITE_FRAMES = selectedFrames.length;
const SPRITE_W = FRAME_W * SPRITE_FRAMES;
const SPRITE_H = FRAME_H;

console.log(`Building sprite sheet: ${SPRITE_FRAMES} frames at ${FRAME_W}×${FRAME_H}`);
console.log(`Total sprite dimensions: ${SPRITE_W}×${SPRITE_H}`);

// Build the FFmpeg filter for horizontal tiling
// Scale each input, then hstack them all
const inputs = selectedFrames.map((f, i) => `-i "${f}"`).join(' ');
const scales = selectedFrames.map((_, i) => `[${i}:v]scale=${FRAME_W}:${FRAME_H}:flags=lanczos[s${i}]`).join(';');
const hstackInputs = selectedFrames.map((_, i) => `[s${i}]`).join('');

const cmd = `ffmpeg -y ${inputs} -filter_complex "${scales};${hstackInputs}hstack=inputs=${SPRITE_FRAMES}" -frames:v 1 -c:v libwebp -quality 80 -compression_level 6 "${OUTPUT}"`;

console.log('Running FFmpeg...');

try {
    execSync(cmd, { 
        stdio: 'pipe',
        env: { ...process.env, Path: [
            process.env.Path,
            'C:\\Users\\julia\\AppData\\Local\\Microsoft\\WinGet\\Links'
        ].join(';')}
    });
    
    const stats = fs.statSync(OUTPUT);
    console.log(`\nSprite sheet saved: ${OUTPUT}`);
    console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log(`\nCSS config:`);
    console.log(`  --sprite-frames: ${SPRITE_FRAMES};`);
    console.log(`  --sprite-width: ${SPRITE_W}px;`);
    console.log(`  animation-duration: ${(SPRITE_FRAMES * FRAME_STEP) / 30}s;`);
    console.log(`  background-size: ${SPRITE_FRAMES * 100}% 100%;`);
    console.log(`  steps(${SPRITE_FRAMES - 1})`);
} catch (e) {
    console.error('FFmpeg failed:', e.stderr?.toString() || e.message);
    process.exit(1);
}
