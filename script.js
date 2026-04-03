
document.addEventListener('DOMContentLoaded', () => {

    class PhysicsVectorModel {
        constructor(config) {
            this.container = document.querySelector(config.containerSelector);
            if (!this.container) return;

            // Elements
            this.mainVector = this.container.querySelector('.main-vector');
            this.dynamicGradient = document.getElementById(config.gradientId);
            this.gradientStop2 = this.dynamicGradient ? this.dynamicGradient.querySelectorAll('stop')[1] : null;
            
            this.is1Offset = document.getElementById(config.ids.is1Offset);
            this.is2Offset = document.getElementById(config.ids.is2Offset);
            
            this.ds1Offset = document.getElementById(config.ids.ds1Offset);
            this.ds2Offset = document.getElementById(config.ids.ds2Offset);
            this.ds3Offset = document.getElementById(config.ids.ds3Offset);
            
            this.ds1Blur = document.getElementById(config.ids.ds1Blur);
            this.ds2Blur = document.getElementById(config.ids.ds2Blur);
            this.ds3Blur = document.getElementById(config.ids.ds3Blur);
            this.is1Blur = document.getElementById(config.ids.is1Blur);
            this.is2Blur = document.getElementById(config.ids.is2Blur);

            // Viewbox settings
            this.svgViewBoxW = config.viewBoxW;
            this.svgViewBoxH = config.viewBoxH;

            // Physics variables - normalized to viewBox scale
            this.SENSITIVITY = 0.12; // Base responsiveness
            this.MAX_DRIFT = 200;    // Max distance in viewBox units

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
                this.visualLeft = this.rect.left + this.rect.width - this.visualWidth;
                this.visualTop = this.rect.top;
            } else {
                visualScale = this.rect.width / this.svgViewBoxW;
                this.visualWidth = this.rect.width;
                this.visualHeight = this.svgViewBoxH * visualScale;
                this.visualLeft = this.rect.left;
                this.visualTop = this.rect.top + (this.rect.height - this.visualHeight) / 2;
            }

            this.cx = this.visualLeft + this.visualWidth / 2;
            this.cy = this.visualTop + this.visualHeight / 2;
            this.scaleX = visualScale;
            this.scaleY = visualScale;
            this.avgScale = visualScale;

            if(this.ds1Blur) this.ds1Blur.setAttribute('stdDeviation', 65 / this.avgScale); 
            if(this.ds2Blur) this.ds2Blur.setAttribute('stdDeviation', 40 / this.avgScale);
            if(this.ds3Blur) this.ds3Blur.setAttribute('stdDeviation', 110 / this.avgScale);
            if(this.is1Blur) this.is1Blur.setAttribute('stdDeviation', 20 / this.avgScale);
            if(this.is2Blur) this.is2Blur.setAttribute('stdDeviation', 10 / this.avgScale);
        }

        updateFrame(mouseX, mouseY) {
            if (!this.rect || !this.ds1Offset) return;

            // 1. Calculate Distances and Factors
            const dx = mouseX - this.cx;
            const dy = mouseY - this.cy;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // Interaction Thresholds (Screen Pixels)
            const highlightRadius = Math.max(this.visualWidth, this.visualHeight) * 0.8;
            const fadeRadius = highlightRadius * 3;

            // Calculate Factor for Proximity Highlighting (0 to 1)
            let proximityFactor = 0;
            if (distance < highlightRadius) {
                proximityFactor = 1;
            } else if (distance < fadeRadius) {
                proximityFactor = 1 - ((distance - highlightRadius) / (fadeRadius - highlightRadius));
            }

            // 2. Update Shadows (Opposite Direction, responsive but attached)
            // We use a non-linear scaling to keep them "attached" but trailing
            const shadowX = -dx * this.SENSITIVITY;
            const shadowY = -dy * this.SENSITIVITY;

            // Apply to Drop Shadows
            this.ds1Offset.setAttribute('dx', (shadowX * 1.5) / this.scaleX);
            this.ds1Offset.setAttribute('dy', (shadowY * 1.8) / this.scaleY);
            
            this.ds2Offset.setAttribute('dx', (shadowX * 0.8) / this.scaleX);
            this.ds2Offset.setAttribute('dy', (shadowY * 1.2) / this.scaleY);

            this.ds3Offset.setAttribute('dx', (shadowX * 2.5) / this.scaleX);
            this.ds3Offset.setAttribute('dy', (shadowY * 3.0) / this.scaleY);

            // Apply to Inner Shadows (Inverted trailing for depth)
            this.is1Offset.setAttribute('dx', (-shadowX * 0.6) / this.scaleX);
            this.is1Offset.setAttribute('dy', (-shadowY * 0.6) / this.scaleY);
            
            this.is2Offset.setAttribute('dx', (-shadowX * 0.4) / this.scaleX);
            this.is2Offset.setAttribute('dy', (-shadowY * 0.4) / this.scaleY);

            // 3. Update Dynamic Gradient Color (Highlighting)
            if (this.gradientStop2) {
                // Interpolate from #139DDE (base) to #3FE0FF (highlight)
                // #139DDE -> R:19, G:157, B:222
                // #3FE0FF -> R:63, G:224, B:255
                const r = Math.round(19 + (63 - 19) * proximityFactor);
                const g = Math.round(157 + (224 - 157) * proximityFactor);
                const b = Math.round(222 + (255 - 222) * proximityFactor);
                this.gradientStop2.setAttribute('stop-color', `rgb(${r},${g},${b})`);
            }

            // 4. Update Gradient Position (Flashlight)
            const sx = ((mouseX - this.visualLeft) / this.visualWidth) * this.svgViewBoxW;
            const sy = ((mouseY - this.visualTop) / this.visualHeight) * this.svgViewBoxH;

            this.dynamicGradient.setAttribute('cx', sx);
            this.dynamicGradient.setAttribute('cy', sy);

            const screenRadius = Math.max(window.innerWidth, window.innerHeight) * 1.8;
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
        ids: {
            is1Offset: 'gcp-is1-offset', is2Offset: 'gcp-is2-offset',
            ds1Offset: 'gcp-ds1-offset', ds2Offset: 'gcp-ds2-offset', ds3Offset: 'gcp-ds3-offset',
            ds1Blur: 'gcp-ds1-blur', ds2Blur: 'gcp-ds2-blur', ds3Blur: 'gcp-ds3-blur',
            is1Blur: 'gcp-is1-blur', is2Blur: 'gcp-is2-blur'
        }
    });

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let isTicking = false;

    window.addEventListener('resize', () => {
        mainModel.cacheLayout();
        gcpModel.cacheLayout();
        if (!isTicking) {
            requestAnimationFrame(() => {
                mainModel.updateFrame(mouseX, mouseY);
                gcpModel.updateFrame(mouseX, mouseY);
                isTicking = false;
            });
            isTicking = true;
        }
    });

    const elipse = document.getElementById('elipse');

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isTicking) {
            requestAnimationFrame(() => {
                mainModel.updateFrame(mouseX, mouseY);
                gcpModel.updateFrame(mouseX, mouseY);

                // Update CSS Elipse Cursor position
                if (elipse) {
                    elipse.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
                }

                isTicking = false;
            });
            isTicking = true;
        }
    });

    // Initial render
    setTimeout(() => {
        mainModel.cacheLayout();
        gcpModel.cacheLayout();
        mainModel.updateFrame(mouseX, mouseY);
        gcpModel.updateFrame(mouseX, mouseY);
        if (elipse) {
            elipse.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        }
    }, 100);
});
