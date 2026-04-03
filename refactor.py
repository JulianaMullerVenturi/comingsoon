import re
import os

html_path = 'index.html'
js_path = 'script.js'
css_path = 'style.css'
gcp_svg_path = 'logo-gcp.svg'

with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

with open(gcp_svg_path, 'r', encoding='utf-8') as f:
    gcp_svg_content = f.read()

# Extract inner contents of GCP SVG
gcp_inner = re.search(r'<svg[^>]*>(.*?)</svg>', gcp_svg_content, re.DOTALL).group(1)
# Clean up styles from GCP SVG if any to avoid conflicts, though they are inside defs
gcp_inner = re.sub(r'<style>.*?</style>', '', gcp_inner, flags=re.DOTALL)

# In index.html, we need to extract the filter definitions to duplicate them for GCP with `gcp-` prefix
filters_block = re.search(r'(<!-- Inner Shadow 1 \(Normal\) -->.*?)</defs>', html_content, re.DOTALL).group(1)

# Create GCP specific filters
gcp_filters = filters_block.replace('id="inner-shadow-', 'id="gcp-inner-shadow-')
gcp_filters = gcp_filters.replace('id="is1-', 'id="gcp-is1-')
gcp_filters = gcp_filters.replace('id="is2-', 'id="gcp-is2-')
gcp_filters = gcp_filters.replace('id="drop-shadow-', 'id="gcp-drop-shadow-')
gcp_filters = gcp_filters.replace('id="ds1-', 'id="gcp-ds1-')
gcp_filters = gcp_filters.replace('id="ds2-', 'id="gcp-ds2-')
gcp_filters = gcp_filters.replace('id="ds3-', 'id="gcp-ds3-')
gcp_filters = gcp_filters.replace('id="dynamic-gradient"', 'id="gcp-dynamic-gradient"')
gcp_filters = gcp_filters.replace('url(#dynamic-gradient)', 'url(#gcp-dynamic-gradient)')

# Build GCP Container HTML
gcp_html = f"""
    <div class="gcp-container" id="gcp-container">
        <!-- SVG Definitions for GCP -->
        <svg style="width: 0; height: 0; position: absolute;" aria-hidden="true" focusable="false">
            <defs>
                <g id="gcp-shape">
                    {gcp_inner.strip()}
                </g>
                {gcp_filters.strip()}
            </defs>
        </svg>

        <!-- Drop Shadow 3 Layer (Ambient Trail) -->
        <svg class="layer drop-shadow-3" viewBox="0 0 1341 1341" preserveAspectRatio="xMaxYMid meet">
            <use href="#gcp-shape" filter="url(#gcp-drop-shadow-3-filter)" />
        </svg>

        <!-- Drop Shadow 1 Layer (Halo) -->
        <svg class="layer drop-shadow-1" viewBox="0 0 1341 1341" preserveAspectRatio="xMaxYMid meet">
            <use href="#gcp-shape" filter="url(#gcp-drop-shadow-1-filter)" />
        </svg>

        <!-- Drop Shadow 2 Layer (Core Highlight) -->
        <svg class="layer drop-shadow-2" viewBox="0 0 1341 1341" preserveAspectRatio="xMaxYMid meet">
            <use href="#gcp-shape" filter="url(#gcp-drop-shadow-2-filter)" />
        </svg>

        <!-- Main Fill Layer -->
        <svg class="layer main-vector" viewBox="0 0 1341 1341" preserveAspectRatio="xMaxYMid meet">
            <use href="#gcp-shape" fill="url(#gcp-dynamic-gradient)" />
        </svg>

        <!-- Inner Shadow 1 Layer -->
        <svg class="layer inner-shadow-1-layer" viewBox="0 0 1341 1341" preserveAspectRatio="xMaxYMid meet">
            <use href="#gcp-shape" filter="url(#gcp-inner-shadow-1-filter)" />
        </svg>

        <!-- Inner Shadow 2 Layer -->
        <svg class="layer inner-shadow-2-layer" viewBox="0 0 1341 1341" preserveAspectRatio="xMaxYMid meet">
            <use href="#gcp-shape" filter="url(#gcp-inner-shadow-2-filter)" />
        </svg>
    </div>
"""

# Insert before closing body tag
html_content = html_content.replace('</body>', gcp_html + '\n</body>')
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Update style.css
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Make sure SVGs inside both containers are styled easily by applying .layer to width/height 100%
if '.gcp-container' not in css_content:
    css_content += """

.gcp-container {
    position: absolute;
    top: 40px;
    left: 40px;
    width: 95px;
    height: 95px;
    z-index: 100;
}

.gcp-container .layer {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
}
"""
with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css_content)

# Update script.js entirely to use the Class based architecture
js_class_code = """
document.addEventListener('DOMContentLoaded', () => {

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
            
            this.ds1Blur = document.getElementById(config.ids.ds1Blur);
            this.ds2Blur = document.getElementById(config.ids.ds2Blur);
            this.ds3Blur = document.getElementById(config.ids.ds3Blur);
            this.is1Blur = document.getElementById(config.ids.is1Blur);
            this.is2Blur = document.getElementById(config.ids.is2Blur);

            // Viewbox settings
            this.svgViewBoxW = config.viewBoxW;
            this.svgViewBoxH = config.viewBoxH;

            // Base mapping coordinates
            this.MAPPED_X = 500;
            this.MAPPED_Y = -500;

            // Physics variables
            this.ds1_base_x = 95; this.ds1_base_y = 190;
            this.ds2_base_x = 45; this.ds2_base_y = 90;
            this.ds3_base_x = 145; this.ds3_base_y = 290;
            this.is1_base_x = 85; this.is1_base_y = 250;
            this.is2_base_x = 105; this.is2_base_y = 305;

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

            if(this.ds1Blur) this.ds1Blur.setAttribute('stdDeviation', 60 / this.avgScale); 
            if(this.ds2Blur) this.ds2Blur.setAttribute('stdDeviation', 38 / this.avgScale);
            if(this.ds3Blur) this.ds3Blur.setAttribute('stdDeviation', 100 / this.avgScale);
            if(this.is1Blur) this.is1Blur.setAttribute('stdDeviation', 20 / this.avgScale);
            if(this.is2Blur) this.is2Blur.setAttribute('stdDeviation', 10 / this.avgScale);
        }

        updateFrame(mouseX, mouseY) {
            if (!this.rect || !this.ds1Offset) return;

            const dx = mouseX - this.cx;
            const dy = mouseY - this.cy;

            const mappedDx = this.MAPPED_X - this.cx;
            const mappedDy = this.MAPPED_Y - this.cy;

            let factorX = mappedDx !== 0 ? (dx / mappedDx) : 0;
            let factorY = mappedDy !== 0 ? (dy / mappedDy) : 0;

            this.ds1Offset.setAttribute('dx', (this.ds1_base_x * factorX) / this.scaleX);
            this.ds1Offset.setAttribute('dy', (this.ds1_base_y * factorY) / this.scaleY);

            this.ds2Offset.setAttribute('dx', (this.ds2_base_x * factorX) / this.scaleX);
            this.ds2Offset.setAttribute('dy', (this.ds2_base_y * factorY) / this.scaleY);

            this.ds3Offset.setAttribute('dx', (this.ds3_base_x * factorX) / this.scaleX);
            this.ds3Offset.setAttribute('dy', (this.ds3_base_y * factorY) / this.scaleY);

            this.is1Offset.setAttribute('dx', (this.is1_base_x * factorX) / this.scaleX);
            this.is1Offset.setAttribute('dy', (this.is1_base_y * factorY) / this.scaleY);

            this.is2Offset.setAttribute('dx', (this.is2_base_x * factorX) / this.scaleX);
            this.is2Offset.setAttribute('dy', (this.is2_base_y * factorY) / this.scaleY);

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

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!isTicking) {
            requestAnimationFrame(() => {
                mainModel.updateFrame(mouseX, mouseY);
                gcpModel.updateFrame(mouseX, mouseY);
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
    }, 100);
});
"""

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js_class_code)

print("Done")
