document.addEventListener('DOMContentLoaded', () => {
    const elipse = document.getElementById('elipse');
    const root = document.documentElement;
    const mainVector = document.querySelector('.main-vector');
    
    // Dynamic Gradient Elements
    const dynamicGradient = document.getElementById('dynamic-gradient');
    
    // Inner Shadow Offset Elements
    const is1Offset = document.getElementById('is1-offset');
    const is2Offset = document.getElementById('is2-offset');

    // Drop Shadow Offset Elements
    const ds1Offset = document.getElementById('ds1-offset');
    const ds2Offset = document.getElementById('ds2-offset');
    const ds3Offset = document.getElementById('ds3-offset');

    // Reference Mapping Metrics
    // According to user, base values correspond to Elipse Position (relative to center) of x: 500, y: -500
    const MAPPED_X = 500;
    const MAPPED_Y = -500;

    // Drop Shadow 1 (Overlay) Base State
    // Tightened offset so the shadow hugs the vector shape closer
    const ds1_base_x = 25;
    const ds1_base_y = 45;
    
    // Drop Shadow 2 (Difference/Core) Base State
    // Tightly wrapped sharp highlight offset
    const ds2_base_x = 10;
    const ds2_base_y = 20;

    // Drop Shadow 3 (Far Background Glow) Base State
    // Brought in ambient spill significantly so it doesn't wash out
    const ds3_base_x = 100;
    const ds3_base_y = 200;

    // Inner Shadow 1 (Normal) Base State
    // Updated x from 7 to 85 to simulate lateral light physics
    const is1_base_x = 85; 
    const is1_base_y = 175;

    // Inner Shadow 2 (Normal) Base State
    // Updated x from 2 to 95 to simulate lateral light physics
    const is2_base_x = 95;
    const is2_base_y = 195;

    // Viewbox logic metrics for unit normalization
    const svgViewBoxW = 406.78;
    const svgViewBoxH = 407;

    let rect, cx, cy, scaleX, scaleY, avgScale, visualLeft, visualTop, visualWidth, visualHeight;

    // Blur elements for optimized static updates
    const ds1Blur = document.getElementById('ds1-blur');
    const ds2Blur = document.getElementById('ds2-blur');
    const ds3Blur = document.getElementById('ds3-blur');
    const is1Blur = document.getElementById('is1-blur');
    const is2Blur = document.getElementById('is2-blur');

    function cacheLayout() {
        rect = mainVector.getBoundingClientRect();
        if (!rect || rect.width === 0) {
            scaleX = 1; scaleY = 1; avgScale = 1;
            cx = window.innerWidth / 2; cy = window.innerHeight / 2;
            return;
        }
        
        const viewBoxAspectRatio = svgViewBoxW / svgViewBoxH;
        const screenAspectRatio = rect.width / rect.height;
        
        let visualScale;
        
        if (screenAspectRatio > viewBoxAspectRatio) {
            visualScale = rect.height / svgViewBoxH;
            visualWidth = svgViewBoxW * visualScale;
            visualHeight = rect.height;
            visualLeft = rect.left + rect.width - visualWidth; // xMax aligns to right
            visualTop = rect.top;
        } else {
            visualScale = rect.width / svgViewBoxW;
            visualWidth = rect.width;
            visualHeight = svgViewBoxH * visualScale;
            visualLeft = rect.left;
            visualTop = rect.top + (rect.height - visualHeight) / 2; // YMid aligns to center
        }

        cx = visualLeft + visualWidth / 2;
        cy = visualTop + visualHeight / 2;
        scaleX = visualScale;
        scaleY = visualScale;
        avgScale = visualScale;

        // Optimization: Pre-calculate blurs only on resize/init, not every frame
        ds1Blur.setAttribute('stdDeviation', 30 / avgScale); // Down from 87.5
        ds2Blur.setAttribute('stdDeviation', 15 / avgScale); // Down from 47.5
        ds3Blur.setAttribute('stdDeviation', 100 / avgScale); // Down from 180
        is1Blur.setAttribute('stdDeviation', 20 / avgScale);
        is2Blur.setAttribute('stdDeviation', 10 / avgScale);
    }

    cacheLayout();
    window.addEventListener('resize', cacheLayout);

    // RequestAnimationFrame optimization
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isTicking = false;

    // Calculate baseline vector center and apply math interpolation
    function updatePhysics() {
        if (!rect) return; // Wait for layout

        // Offset from physical center
        const dx = mouseX - cx;
        const dy = mouseY - cy;

        // Absolute screen coords for the baseline mapping
        const mappedDx = MAPPED_X - cx;
        const mappedDy = MAPPED_Y - cy;

        // Calculate proportionality so when mouseX=MAPPED_X, factorX=1
        // and when mouseX=cx, factorX=0
        let factorX = mappedDx !== 0 ? (dx / mappedDx) : 0;
        let factorY = mappedDy !== 0 ? (dy / mappedDy) : 0;

        // Prevent erratic jumps when resizing/extreme scrolling 
        // We let the factors naturally clamp organically through multiplication

        // 1. Update Drop Shadows directly in SVG DOM
        ds1Offset.setAttribute('dx', (ds1_base_x * factorX) / scaleX);
        ds1Offset.setAttribute('dy', (ds1_base_y * factorY) / scaleY);

        ds2Offset.setAttribute('dx', (ds2_base_x * factorX) / scaleX);
        ds2Offset.setAttribute('dy', (ds2_base_y * factorY) / scaleY);

        ds3Offset.setAttribute('dx', (ds3_base_x * factorX) / scaleX);
        ds3Offset.setAttribute('dy', (ds3_base_y * factorY) / scaleY);

        // 2. Update Inner Shadows directly in SVG DOM
        is1Offset.setAttribute('dx', (is1_base_x * factorX) / scaleX);
        is1Offset.setAttribute('dy', (is1_base_y * factorY) / scaleY);

        is2Offset.setAttribute('dx', (is2_base_x * factorX) / scaleX);
        is2Offset.setAttribute('dy', (is2_base_y * factorY) / scaleY);

        // 3. Update dynamic radial gradient focal point
        // Convert screen coordinates of cursor into SVG internal viewbox space
        const sx = ((mouseX - visualLeft) / visualWidth) * svgViewBoxW;
        const sy = ((mouseY - visualTop) / visualHeight) * svgViewBoxH;

        dynamicGradient.setAttribute('cx', sx);
        dynamicGradient.setAttribute('cy', sy);

        // Keep the light spread wide enough to hit the vector from the opposite screen edge
        const screenRadius = Math.max(window.innerWidth, window.innerHeight) * 1.8;
        const svgRadius = screenRadius / avgScale;
        dynamicGradient.setAttribute('r', svgRadius);

        // 4. Update Custom Cursor overlay positioning
        elipse.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;

        // 5. Update CSS root variables for radial distance masking on shadows
        root.style.setProperty('--mouse-x', `${mouseX}px`);
        root.style.setProperty('--mouse-y', `${mouseY}px`);

        isTicking = false;
    }

    // Attach high performance event listener
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isTicking) {
            window.requestAnimationFrame(updatePhysics);
            isTicking = true;
        }
    });

    // Support window resizing edgecase checks
    window.addEventListener('resize', () => {
         if (!isTicking) {
            window.requestAnimationFrame(updatePhysics);
            isTicking = true;
        }
    });
    
    // Boot initial cycle
    updatePhysics();
});
