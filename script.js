document.addEventListener('DOMContentLoaded', () => {



    class Spring {
        constructor(stiffness, damping) {
            this.stiffness = stiffness;
            this.damping = damping;
            this.px = window.innerWidth / 2;
            this.py = window.innerHeight / 2;
            this.vx = 0;
            this.vy = 0;
            this.targetX = window.innerWidth / 2;
            this.targetY = window.innerHeight / 2;
        }

        setTarget(x, y) {
            this.targetX = x;
            this.targetY = y;
        }

        update(dt = 0.016) {
            // Securely cap frame delta to protect Euler math from explosion if tab goes completely idle
            let safeDt = Math.min(dt, 0.05);
            
            const ax = -this.stiffness * (this.px - this.targetX) - this.damping * this.vx;
            const ay = -this.stiffness * (this.py - this.targetY) - this.damping * this.vy;
            
            this.vx += ax * safeDt;
            this.vy += ay * safeDt;
            this.px += this.vx * safeDt;
            this.py += this.vy * safeDt;
        }
    }

    class PhysicsVectorModel {
        constructor(config) {
            this.container = document.querySelector(config.containerSelector);
            if (!this.container) return;

            // Elements
            this.mainVector = this.container.querySelector('.main-vector');
            this.dynamicGradient = document.getElementById(config.gradientId);
            
            this.is1Offset = document.getElementById(config.ids.is1Offset);
            this.is2Offset = document.getElementById(config.ids.is2Offset);
            
            this.ds1Offset = document.getElementById(config.ids.ds1Offset);
            this.ds2Offset = document.getElementById(config.ids.ds2Offset);
            this.ds3Offset = document.getElementById(config.ids.ds3Offset);
            this.ds4Offset = document.getElementById(config.ids.ds4Offset);
            
            this.ds1Blur = document.getElementById(config.ids.ds1Blur);
            this.ds2Blur = document.getElementById(config.ids.ds2Blur);
            this.ds3Blur = document.getElementById(config.ids.ds3Blur);
            this.ds4Blur = document.getElementById(config.ids.ds4Blur);
            this.is1Blur = document.getElementById(config.ids.is1Blur);
            this.is2Blur = document.getElementById(config.ids.is2Blur);

            // Viewbox settings
            this.svgViewBoxW = config.viewBoxW;
            this.svgViewBoxH = config.viewBoxH;

            // Base mapping coordinates
            this.MAPPED_X = 500;
            this.MAPPED_Y = -500;

            // Optional configs for scaling effect differences between models
            this.blurScale = config.blurScale || 1;
            this.movementScale = config.movementScale || 1;
            this.innerBlurScale = config.innerBlurScale || this.blurScale;
            this.innerMovementScale = config.innerMovementScale || this.movementScale;
            this.fadeLightOnDistance = config.fadeLightOnDistance || false;
            this.lightRadiusPx = config.lightRadiusPx || null;
            this.lightCoreRadiusPx = config.lightCoreRadiusPx || 0;
            this.innerLightRadiusPx = config.innerLightRadiusPx !== undefined ? config.innerLightRadiusPx : this.lightRadiusPx;
            this.innerLightCoreRadiusPx = config.innerLightCoreRadiusPx !== undefined ? config.innerLightCoreRadiusPx : this.lightCoreRadiusPx;
            this.gradientRadiusPx = config.gradientRadiusPx || null;
            this.minOuterIntensity = config.minOuterIntensity !== undefined ? config.minOuterIntensity : (config.minIntensity || 0);
            this.maxOuterIntensity = config.maxOuterIntensity !== undefined ? config.maxOuterIntensity : 1;
            this.minInnerIntensity = config.minInnerIntensity !== undefined ? config.minInnerIntensity : (config.minIntensity || 0);
            this.is1MaxOpacity = config.is1MaxOpacity !== undefined ? config.is1MaxOpacity : 0.8;
            this.is2MaxOpacity = config.is2MaxOpacity !== undefined ? config.is2MaxOpacity : 0.9;
            this.dynamicInnerBlur = config.dynamicInnerBlur || false;
            this.dynamicLeftBrightness = config.dynamicLeftBrightness || false;

            this.dynamicOuterBlur = config.dynamicOuterBlur || false;
            this.baseDs1Blur = config.baseDs1Blur !== undefined ? config.baseDs1Blur : 60;
            this.baseDs2Blur = config.baseDs2Blur !== undefined ? config.baseDs2Blur : 38;
            this.baseDs3Blur = config.baseDs3Blur !== undefined ? config.baseDs3Blur : 100;
            this.minOuterBlurMult = config.minOuterBlurMult !== undefined ? config.minOuterBlurMult : 0;
            this.blurDistanceFocus = config.blurDistanceFocus !== undefined ? config.blurDistanceFocus : 0;
            this.blurDistanceMax = config.blurDistanceMax !== undefined ? config.blurDistanceMax : 800;
            this.staticLayers = config.staticLayers || [];
            this.fullIntensityLayers = config.fullIntensityLayers || [];
            this.gradientCenterPull = config.gradientCenterPull || 0; // 0 to 1, how much to pull back to center at distance
            this.gradientRadiusScaling = config.gradientRadiusScaling || 0; // how much to inflate radius at distance

            // Physics variables
            this.ds1_base_x = config.ds1_base_x !== undefined ? config.ds1_base_x : 95; 
            this.ds1_base_y = config.ds1_base_y !== undefined ? config.ds1_base_y : 190;
            this.ds2_base_x = config.ds2_base_x !== undefined ? config.ds2_base_x : 45; 
            this.ds2_base_y = config.ds2_base_y !== undefined ? config.ds2_base_y : 90;
            this.ds3_base_y = config.ds3_base_y !== undefined ? config.ds3_base_y : 290;
            this.ds4_base_x = config.ds4_base_x !== undefined ? config.ds4_base_x : 0; 
            this.ds4_base_y = config.ds4_base_y !== undefined ? config.ds4_base_y : 0;
            
            this.is1_base_x = config.is1_base_x !== undefined ? config.is1_base_x : 85; 
            this.is1_base_y = config.is1_base_y !== undefined ? config.is1_base_y : 250;
            this.is2_base_x = config.is2_base_x !== undefined ? config.is2_base_x : 105; 
            this.is2_base_y = config.is2_base_y !== undefined ? config.is2_base_y : 305;

            this.rect = null;
            this.cx = 0; this.cy = 0;
            this.scaleX = 1; this.scaleY = 1; this.avgScale = 1;
            this.visualLeft = 0; this.visualTop = 0;
            this.visualWidth = 0; this.visualHeight = 0;

            this.cacheLayout();
        }

        cacheLayout() {
            if (!this.mainVector) return;
            this.rect = this.mainVector.getBoundingClientRect();
            if (!this.rect || this.rect.width === 0) {
                this.scaleX = 1; this.scaleY = 1; this.avgScale = 1;
                this.cx = window.innerWidth / 2; this.cy = window.innerHeight / 2;
                return;
            }
            
            const viewBoxAspectRatio = this.svgViewBoxW / this.svgViewBoxH;
            const screenAspectRatio = this.rect.width / this.rect.height;
            
            let visualScale;
            
            if (screenAspectRatio > viewBoxAspectRatio) {
                visualScale = this.rect.height / this.svgViewBoxH;
                this.visualWidth = this.svgViewBoxW * visualScale;
                this.visualHeight = this.rect.height;
                this.visualLeft = this.rect.left + this.rect.width - this.visualWidth; // xMax aligns to right
                this.visualTop = this.rect.top;
            } else {
                visualScale = this.rect.width / this.svgViewBoxW;
                this.visualWidth = this.rect.width;
                this.visualHeight = this.svgViewBoxH * visualScale;
                this.visualLeft = this.rect.left;
                this.visualTop = this.rect.top + (this.rect.height - this.visualHeight) / 2; // YMid aligns to center
            }

            this.cx = this.visualLeft + this.visualWidth / 2;
            this.cy = this.visualTop + this.visualHeight / 2;
            this.scaleX = visualScale;
            this.scaleY = visualScale;
            this.avgScale = visualScale;

            if(this.ds1Blur && !this.dynamicOuterBlur) this.ds1Blur.setAttribute('stdDeviation', this.baseDs1Blur / this.avgScale); 
            if(this.ds2Blur && !this.dynamicOuterBlur) this.ds2Blur.setAttribute('stdDeviation', this.baseDs2Blur / this.avgScale);
            if(this.ds3Blur && !this.dynamicOuterBlur) this.ds3Blur.setAttribute('stdDeviation', this.baseDs3Blur / this.avgScale);
            if(this.ds4Blur && !this.dynamicOuterBlur) this.ds4Blur.setAttribute('stdDeviation', this.baseDs4Blur / this.avgScale);
            if(this.is1Blur && !this.dynamicInnerBlur) this.is1Blur.setAttribute('stdDeviation', (20 * this.innerBlurScale) / this.avgScale);
            if(this.is2Blur && !this.dynamicInnerBlur) this.is2Blur.setAttribute('stdDeviation', (10 * this.innerBlurScale) / this.avgScale);
        }

        updateFrame(mouseX, mouseY) {
            if (!this.rect) return;



            const dx = mouseX - this.cx;
            const dy = mouseY - this.cy;
            const d = Math.sqrt(dx * dx + dy * dy);

            // Fix direction bug: always map against global window center to keep movement logic identical
            const globalCx = window.innerWidth / 2;
            const globalCy = window.innerHeight / 2;
            const mappedDx = this.MAPPED_X - globalCx;
            const mappedDy = this.MAPPED_Y - globalCy;

            let factorX = mappedDx !== 0 ? (dx / mappedDx) : 0;
            let factorY = mappedDy !== 0 ? (dy / mappedDy) : 0;

            if (!this.staticLayers.includes('ds1')) {
                this.ds1Offset.setAttribute('dx', (this.ds1_base_x * factorX * this.movementScale) / this.scaleX);
                this.ds1Offset.setAttribute('dy', (this.ds1_base_y * factorY * this.movementScale) / this.scaleY);
            } else {
                this.ds1Offset.setAttribute('dx', 0);
                this.ds1Offset.setAttribute('dy', 0);
            }

            if (!this.staticLayers.includes('ds2')) {
                this.ds2Offset.setAttribute('dx', (this.ds2_base_x * factorX * this.movementScale) / this.scaleX);
                this.ds2Offset.setAttribute('dy', (this.ds2_base_y * factorY * this.movementScale) / this.scaleY);
            } else {
                this.ds2Offset.setAttribute('dx', 0);
                this.ds2Offset.setAttribute('dy', 0);
            }

            if (!this.staticLayers.includes('ds3')) {
                this.ds3Offset.setAttribute('dx', (this.ds3_base_x * factorX * this.movementScale) / this.scaleX);
                this.ds3Offset.setAttribute('dy', (this.ds3_base_y * factorY * this.movementScale) / this.scaleY);
            } else {
                this.ds3Offset.setAttribute('dx', 0);
                this.ds3Offset.setAttribute('dy', 0);
            }

            if (this.ds4Offset) {
                if (!this.staticLayers.includes('ds4')) {
                    this.ds4Offset.setAttribute('dx', (this.ds4_base_x * factorX * this.movementScale) / this.scaleX);
                    this.ds4Offset.setAttribute('dy', (this.ds4_base_y * factorY * this.movementScale) / this.scaleY);
                } else {
                    this.ds4Offset.setAttribute('dx', 0);
                    this.ds4Offset.setAttribute('dy', 0);
                }
            }

            this.is1Offset.setAttribute('dx', (this.is1_base_x * factorX * this.innerMovementScale) / this.scaleX);
            this.is1Offset.setAttribute('dy', (this.is1_base_y * factorY * this.innerMovementScale) / this.scaleY);

            this.is2Offset.setAttribute('dx', (this.is2_base_x * factorX * this.innerMovementScale) / this.scaleX);
            this.is2Offset.setAttribute('dy', (this.is2_base_y * factorY * this.innerMovementScale) / this.scaleY);

            if (this.dynamicOuterBlur) {
                let blurMult = 0;
                if (d > this.blurDistanceFocus) {
                    blurMult = Math.min((d - this.blurDistanceFocus) / (this.blurDistanceMax - this.blurDistanceFocus), 1);
                    blurMult = Math.pow(blurMult, 0.8); 
                }

                let finalMult = this.minOuterBlurMult + (1 - this.minOuterBlurMult) * blurMult;

                let blur1 = Math.max((this.baseDs1Blur * finalMult) / this.avgScale, 0.01);
                let blur2 = Math.max((this.baseDs2Blur * finalMult) / this.avgScale, 0.01);
                let blur3 = Math.max((this.baseDs3Blur * finalMult) / this.avgScale, 0.01);

                if (this.ds1Blur) this.ds1Blur.setAttribute('stdDeviation', blur1); 
                if (this.ds2Blur) this.ds2Blur.setAttribute('stdDeviation', blur2);
                if (this.ds3Blur) this.ds3Blur.setAttribute('stdDeviation', blur3);
                if (this.ds4Blur) this.ds4Blur.setAttribute('stdDeviation', (this.baseDs4Blur * finalMult) / this.avgScale);
            }

            if (this.dynamicInnerBlur) {
                // Keep blur strictly at normal base values for the majority of the screen
                let blurMult = 1;
                
                // Activate scaling earlier as the cursor enters the left quarter of the screen
                const leftThreshold = window.innerWidth * 0.25; 
                
                if (mouseX < leftThreshold) {
                    // Calculate penetration depth into the left threshold width
                    const edgeProximity = 1 - (Math.max(mouseX, 0) / leftThreshold);
                    // Use a softer curve and a lower maximum scaling factor (capped at ~1.85x total)
                    blurMult = 1 + (0.85 * Math.pow(edgeProximity, 1.5)); 
                }

                if (this.is1Blur) this.is1Blur.setAttribute('stdDeviation', (20 * this.innerBlurScale * blurMult) / this.avgScale);
                if (this.is2Blur) this.is2Blur.setAttribute('stdDeviation', (10 * this.innerBlurScale * blurMult) / this.avgScale);
            }

            // Fade out ALL light (drop shadows & inner shadows) when cursor moves away
            if (this.fadeLightOnDistance) {
                const fadeRadius = this.lightRadiusPx || 150;
                const coreRadius = this.lightCoreRadiusPx || 0;
                
                let intensity;
                if (d <= coreRadius) {
                    intensity = 1;
                } else {
                    intensity = 1 - ((d - coreRadius) / (fadeRadius - coreRadius));
                }
                
                let outerIntensity = intensity;
                if (outerIntensity < this.minOuterIntensity) outerIntensity = this.minOuterIntensity;
                if (outerIntensity > this.maxOuterIntensity) outerIntensity = this.maxOuterIntensity;

                const innerFadeRadius = this.innerLightRadiusPx || 150;
                const innerCoreRadius = this.innerLightCoreRadiusPx || 0;
                let innerBaseRaw;
                if (d <= innerCoreRadius) {
                    innerBaseRaw = 1;
                } else {
                    innerBaseRaw = 1 - ((d - innerCoreRadius) / (innerFadeRadius - innerCoreRadius));
                }

                let baseInnerIntensity = innerBaseRaw;
                if (baseInnerIntensity < this.minInnerIntensity) baseInnerIntensity = this.minInnerIntensity;
                if (baseInnerIntensity > 1) baseInnerIntensity = 1;

                // Outer light (drop shadows)
                const ds1 = this.container.querySelector('.drop-shadow-1');
                const ds2 = this.container.querySelector('.drop-shadow-2');
                const ds3 = this.container.querySelector('.drop-shadow-3');
                const ds4 = this.container.querySelector('.drop-shadow-4');
                
                if (ds1) ds1.style.opacity = 0.6 * (this.fullIntensityLayers.includes('ds1') ? 1 : outerIntensity);
                if (ds2) ds2.style.opacity = 0.85 * (this.fullIntensityLayers.includes('ds2') ? 1 : outerIntensity);
                if (ds3) ds3.style.opacity = 0.95 * (this.fullIntensityLayers.includes('ds3') ? 1 : outerIntensity);
                if (ds4) ds4.style.opacity = 0.5 * (this.fullIntensityLayers.includes('ds4') ? 1 : outerIntensity);

                // Inner light (inner shadows)
                const inner1 = this.container.querySelector('.inner-shadow-1-layer');
                const inner2 = this.container.querySelector('.inner-shadow-2-layer');
                
                let finalInnerOpacity = baseInnerIntensity;
                
                // Create a massive sweet spot to reveal pure #3FE0FF across the entire logo
                const hoverRadius = 160; 
                const hoverCoreRadius = 60; // Huge 120px diameter zero-opacity core
                
                if (d <= hoverCoreRadius) {
                    finalInnerOpacity = 0;
                } else if (d < hoverRadius) {
                    const fade = (d - hoverCoreRadius) / (hoverRadius - hoverCoreRadius);
                    finalInnerOpacity = baseInnerIntensity * Math.pow(fade, 2);
                }

                if (inner1) inner1.style.opacity = this.is1MaxOpacity * finalInnerOpacity;
                if (inner2) inner2.style.opacity = this.is2MaxOpacity * finalInnerOpacity;
            }

            const rawSx = ((mouseX - this.visualLeft) / this.visualWidth) * this.svgViewBoxW;
            const rawSy = ((mouseY - this.visualTop) / this.visualHeight) * this.svgViewBoxH;

            // Apply Center Pull logic: as distance increases, we interpolate back to the direct center (cx/cy of viewport)
            let sx = rawSx;
            let sy = rawSy;
            
            if (this.gradientCenterPull > 0) {
                const centerX = this.svgViewBoxW / 2;
                const centerY = this.svgViewBoxH / 2;
                const pullFactor = Math.min(d / 1200, 1) * this.gradientCenterPull;
                sx = rawSx * (1 - pullFactor) + centerX * pullFactor;
                sy = rawSy * (1 - pullFactor) + centerY * pullFactor;
            }

            this.dynamicGradient.setAttribute('cx', sx);
            this.dynamicGradient.setAttribute('cy', sy);

            let screenRadius;
            if (this.gradientRadiusPx) {
                screenRadius = this.gradientRadiusPx;
            } else {
                screenRadius = Math.max(window.innerWidth, window.innerHeight) * 1.8;
            }

            // Apply Radius Scaling: inflate the radius as we move away to wash the logo in more direct light
            if (this.gradientRadiusScaling > 0) {
                const scaleFactor = 1 + (d / 1000) * this.gradientRadiusScaling;
                screenRadius *= scaleFactor;
            }

            if (this.dynamicLeftBrightness) {
                const leftThreshold = window.innerWidth * 0.25; 
                if (mouseX < leftThreshold) {
                    const edgeProximity = 1 - (Math.max(mouseX, 0) / leftThreshold);
                    // Inflate the radius mapping enough to brightly wash the fill, but constrain it so the distant edge still noticeably decays
                    screenRadius *= (1 + 0.55 * Math.pow(edgeProximity, 1.5));
                }
            }

            const svgRadius = screenRadius / this.avgScale;
            this.dynamicGradient.setAttribute('r', svgRadius);
        }
    }

    // Initialize both models
    const mainModel = new PhysicsVectorModel({
        containerSelector: '.vector-container',
        viewBoxW: 406.78,
        viewBoxH: 407,
        gradientId: 'dynamic-gradient',
        ds3_base_x: 60,  // Shift the bluer shadow off-center
        ds3_base_y: 420, // Elongate the bluer shadow trail
        dynamicInnerBlur: true, // Allow inner shadows to soften and bleed at vast distances
        dynamicLeftBrightness: true, // Inflate the gradient sweep on the far-left coordinate bounds to boost cyan fill presence
        ids: {
            is1Offset: 'is1-offset', is2Offset: 'is2-offset',
            ds1Offset: 'ds1-offset', ds2Offset: 'ds2-offset', ds3Offset: 'ds3-offset',
            ds1Blur: 'ds1-blur', ds2Blur: 'ds2-blur', ds3Blur: 'ds3-blur',
            is1Blur: 'is1-blur', is2Blur: 'is2-blur'
        }
    });

    const gcpModel = new PhysicsVectorModel({
        containerSelector: '.gcp-container',
        viewBoxW: 1341,
        viewBoxH: 1341,
        gradientId: 'gcp-dynamic-gradient',
        blurScale: 1, // Let ds blur naturally base scale
        movementScale: 0.35, // Restored movement for the halo
        innerBlurScale: 0.08, // Sharper inner shadow
        innerMovementScale: 0.22, // Deepen inner shadow intersection
        fadeLightOnDistance: true,
        lightRadiusPx: 800, // Large physical radius for soft fade
        lightCoreRadiusPx: 120, // Remains perfectly 100% intensity until 120px away
        innerLightRadiusPx: 1400, // Inner shadows survive massively longer distances across the screen
        innerLightCoreRadiusPx: 400, // Defines the core zone where interior bounds stay physically 100% bright without decay
        minOuterIntensity: 0.25, // Shadows become notably weaker at a distance
        maxOuterIntensity: 0.55, // Prevent shadows from becoming too bright and blowing out the shape when cursor is directly on top
        minInnerIntensity: 0, // Fade fully to 0 so the internal graphic evaluates purely to #02568B
        
        gradientCenterPull: 0.15, // Significantly reduced pull back
        gradientRadiusScaling: 0.2, // Significantly reduced radius inflation
        
        is1MaxOpacity: 0, // Disable entirely. Massive internal bevel matrices structurally collide natively inside tiny line-art vectors
        is2MaxOpacity: 0, // Disable entirely. Gradient radius tracking perfectly solves internal shading dynamically now
        
        dynamicOuterBlur: false,
        staticLayers: ['ds1', 'ds3', 'ds4'], // Halo, Trail, and Soft Underglow are now locked
        fullIntensityLayers: ['ds1', 'ds4'], // Halo and Soft Underglow are always bright
        
        baseDs1Blur: 65,
        baseDs2Blur: 8,
        baseDs3Blur: 100,
        baseDs4Blur: 25, // Soft ambient glow
        minOuterBlurMult: 0.4,
        blurDistanceFocus: 80,
        blurDistanceMax: 800,

        ds3_base_x: 60,  // Shift the bluer shadow off-center for GCP too
        ds3_base_y: 450, // Even more exaggerated trail for the smaller logo
        ids: {
            is1Offset: 'gcp-is1-offset', is2Offset: 'gcp-is2-offset',
            ds1Offset: 'gcp-ds1-offset', ds2Offset: 'gcp-ds2-offset', ds3Offset: 'gcp-ds3-offset', ds4Offset: 'gcp-ds4-offset',
            ds1Blur: 'gcp-ds1-blur', ds2Blur: 'gcp-ds2-blur', ds3Blur: 'gcp-ds3-blur', ds4Blur: 'gcp-ds4-blur',
            is1Blur: 'gcp-is1-blur', is2Blur: 'gcp-is2-blur'
        }
    });

    const elipse = document.getElementById('elipse');
    const customCursor = document.getElementById('custom-cursor');
    const cursorSpring = new Spring(300, 28); // Specific Stiffness and Damping for movement
    const scaleSpring = new Spring(400, 30);  // High stiffness for scale snappiness

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isTicking = false;

    // Initial scale values
    scaleSpring.px = 1;
    scaleSpring.targetX = 1;

    document.addEventListener('mousedown', () => {
        scaleSpring.setTarget(0.8, 0); // Target 0.8x scale
    });

    document.addEventListener('mouseup', () => {
        scaleSpring.setTarget(1.0, 0); // Target 1.0x scale
    });

    let prevTime = 0;
    function applyFrame(timestamp) {
        if (!prevTime) prevTime = timestamp;
        let dt = (timestamp - prevTime) / 1000;
        prevTime = timestamp;

        // Autonomous slow, perpetual circular motion from middle-bottom of screen
        const orbitRadius = 100; // short motion
        const orbitSpeed = 0.0008; // slow
        const anchorX = window.innerWidth / 2;
        const anchorY = window.innerHeight - 50; // slightly up from middle-bottom
        
        const orbitX = anchorX + Math.cos(timestamp * orbitSpeed) * orbitRadius;
        const orbitY = anchorY + Math.sin(timestamp * orbitSpeed) * orbitRadius;

        mainModel.updateFrame(orbitX, orbitY);
        gcpModel.updateFrame(orbitX, orbitY);

        // Update Physics Models
        cursorSpring.setTarget(mouseX, mouseY);
        cursorSpring.update(dt || 0.016);
        
        scaleSpring.update(dt || 0.016);

        // Render Elipse (background glow) with hardware-accelerated 4x upscaling
        if (elipse) {
            elipse.style.transform = `translate(${orbitX}px, ${orbitY}px) translate(-50%, -50%) scale(4)`;
        }

        // Render Custom UI Cursor
        if (customCursor) {
            // scaleSpring.px holds our current animated scale
            customCursor.style.transform = `translate(${cursorSpring.px}px, ${cursorSpring.py}px) translate(-50%, -50%) scale(${scaleSpring.px})`;
        }

        requestAnimationFrame(applyFrame);
    }

    // Start high-fidelity physics loop
    requestAnimationFrame(applyFrame);

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Initial render
    setTimeout(() => {
        mainModel.cacheLayout();
        gcpModel.cacheLayout();
        
        const orbitRadius = 100;
        const anchorX = window.innerWidth / 2;
        const anchorY = window.innerHeight - 50;
        
        const orbitX = anchorX + orbitRadius; // Initial cos(0) = 1
        const orbitY = anchorY;               // Initial sin(0) = 0

        mainModel.updateFrame(orbitX, orbitY);
        gcpModel.updateFrame(orbitX, orbitY);
        
        // Render Elipse initialization
        if (elipse) {
            elipse.style.transform = `translate(${orbitX}px, ${orbitY}px) translate(-50%, -50%) scale(4)`;
        }
    }, 100);

    // --- Countdown Timer Logic ---
    let countdownState = {
        days: 30,
        hours: 6,
        minutes: 11,
        seconds: 39
    };

    function formatDigit(val) {
        return val.toString().padStart(2, '0');
    }

    function updateDigit(digitId, newValue) {
        const wrapper = document.getElementById(digitId);
        if (!wrapper) return;
        
        const currentDigit = wrapper.querySelector('.digit.current');
        
        if (currentDigit && currentDigit.innerText === newValue) return;

        if (currentDigit) {
            currentDigit.classList.remove('current');
            currentDigit.classList.add('fade-out');
            
            setTimeout(() => {
                if (currentDigit.parentNode === wrapper) {
                    wrapper.removeChild(currentDigit);
                }
            }, 800);
        }

        const newDigit = document.createElement('div');
        newDigit.className = 'digit current fade-in';
        if (newValue === '1') {
            newDigit.classList.add('digit-one');
        }
        newDigit.innerText = newValue;
        wrapper.appendChild(newDigit);

        setTimeout(() => {
            newDigit.classList.remove('fade-in');
        }, 800);
    }

    function tickCountdown() {
        if (countdownState.seconds > 0) {
            countdownState.seconds--;
        } else {
            countdownState.seconds = 59;
            if (countdownState.minutes > 0) {
                countdownState.minutes--;
            } else {
                countdownState.minutes = 59;
                if (countdownState.hours > 0) {
                    countdownState.hours--;
                } else {
                    countdownState.hours = 23;
                    if (countdownState.days > 0) {
                        countdownState.days--;
                    }
                }
            }
        }

        const daysStr = formatDigit(countdownState.days);
        const hoursStr = formatDigit(countdownState.hours);
        const minutesStr = formatDigit(countdownState.minutes);
        const secondsStr = formatDigit(countdownState.seconds);

        updateDigit('days-tens', daysStr[0]);
        updateDigit('days-ones', daysStr[1]);
        
        updateDigit('hours-tens', hoursStr[0]);
        updateDigit('hours-ones', hoursStr[1]);
        
        updateDigit('minutes-tens', minutesStr[0]);
        updateDigit('minutes-ones', minutesStr[1]);
        
        updateDigit('seconds-tens', secondsStr[0]);
        updateDigit('seconds-ones', secondsStr[1]);

        syncContainerOpticalKerning('days-tens', daysStr[0], daysStr[1]);
        syncContainerOpticalKerning('hours-tens', hoursStr[0], hoursStr[1]);
        syncContainerOpticalKerning('minutes-tens', minutesStr[0], minutesStr[1]);
        syncContainerOpticalKerning('seconds-tens', secondsStr[0], secondsStr[1]);
    }

    function syncContainerOpticalKerning(tensId, tensVal, onesVal) {
        const tensWrapper = document.getElementById(tensId);
        if (tensWrapper && tensWrapper.parentElement) {
            const container = tensWrapper.parentElement;
            if (tensVal === '1') container.classList.add('tens-is-one');
            else container.classList.remove('tens-is-one');

            if (onesVal === '1') container.classList.add('ones-is-one');
            else container.classList.remove('ones-is-one');
        }
    }



    setInterval(tickCountdown, 1000);

});
