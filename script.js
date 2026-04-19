document.addEventListener('DOMContentLoaded', () => {

    // ─── Canvas sprite driver (120 frames, 15fps, 10×12 grid) ─────────
    // Lossless sprite sheet with 4px padding between cells.
    // drawImage clips source rectangles at exact pixel boundaries.
    // Edge vignette stabilizes outermost pixels across all frames.
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const COLS = 10, ROWS = 12, TOTAL = 120;
        const CELL_W = 1280, CELL_H = 720; // sprite cell dimensions
        const PAD = 4;                      // padding between cells in sprite
        const INTERVAL = 8000 / TOTAL;      // ~67ms = 15fps
        let frame = 0;

        // Load sprite sheet
        const spriteImg = new Image();
        spriteImg.onload = function() {
            function resize() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                drawFrame();
            }

            function drawFrame() {
                const col = frame % COLS;
                const row = Math.floor(frame / COLS);
                // Padding-aware source coordinates — skip the 4px gaps
                const sx = col * (CELL_W + PAD);
                const sy = row * (CELL_H + PAD);
                
                // Smart Crop logic for responsive centering
                if (window.innerWidth <= 1024) {
                    // ─── Proportional Smart Crop ───
                    const drawHeight = canvas.height * 0.88;
                    const yOffset = -(canvas.height * 0.03);
                    
                    if (window.innerWidth <= 600) {
                        // Original Mobile Phone Experience: Fixed 405px extraction 
                        // The user preferred the specific framing and tiny aesthetic stretching on phones.
                        ctx.drawImage(spriteImg, sx + 700, sy, 405, CELL_H, 0, yOffset, canvas.width, drawHeight);
                    } else {
                        // Tablet/iPad Experience: Zero-Squish Object-Fit Cover
                        const destRatio = canvas.width / drawHeight;
                        const cropCenter = 902.5; 
                        
                        let cropH = CELL_H;
                        let cropW = cropH * destRatio;
                        
                        if (cropW > 755) {
                            cropW = 755;
                            cropH = cropW / destRatio;
                        }
                        
                        const cropX = cropCenter - (cropW / 2);
                        const cropY = (CELL_H - cropH) / 2; 
                        
                        ctx.drawImage(spriteImg, sx + cropX, sy + cropY, cropW, cropH, 0, yOffset, canvas.width, drawHeight);
                    }

                    // Subtle Bottom Feathering: Applies to all mobile/tablet views
                    const gradient = ctx.createLinearGradient(0, drawHeight + yOffset - 60, 0, drawHeight + yOffset);
                    gradient.addColorStop(0, 'rgba(0, 46, 81, 0)');
                    gradient.addColorStop(1, 'rgba(0, 46, 81, 1)'); 
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, drawHeight + yOffset - 61, canvas.width, 62); 
                } else {
                    // Desktop default: stretch to fit screen bounds
                    ctx.drawImage(spriteImg, sx, sy, CELL_W, CELL_H, 0, 0, canvas.width, canvas.height);
                }
            }

            resize();
            window.addEventListener('resize', resize);

            setInterval(() => {
                frame = (frame + 1) % TOTAL;
                drawFrame();
            }, INTERVAL);
        };
        spriteImg.src = 'background_sprite.webp';
    }

    // ─── GCP Focal Glow — Non-Linear Orbital Animation ───────────────
    // A seamless 8-second clockwise lap with a "Keplerian" speed profile:
    // Slower at the far corner (Top-Right), faster when close to the logo (Bottom-Left).
    const gcpContainer = document.querySelector('.gcp-logo-container');
    const glowElement = document.getElementById('gcp-glow');
    if (gcpContainer) {
        const LAP_TIME = 8000;
        const RADIUS = 4.8;       // Subtle orbit radius - Scaled 1.2x from 4
        const INTENSITY = 0.25; // Subtle acceleration at the logo
        const PHASE_OFFSET = (1.6 * Math.PI); // Shifted slightly earlier (~288 deg) to time the approach

        const START_PHASE = 1.55 * Math.PI; // Startup phase offset (near Apoapsis)

        function animateFocalGlow() {
            const timestamp = performance.now();
            const normalizedTime = (timestamp % LAP_TIME) / LAP_TIME;
            const phi = (normalizedTime * 2 * Math.PI) + START_PHASE;
            
            // Warp the angle to satisfy the variable speed requirement
            const visualAngle = phi - INTENSITY * Math.sin(phi - PHASE_OFFSET);

            const dx = Math.cos(visualAngle) * RADIUS;
            const dy = Math.sin(visualAngle) * RADIUS;

            // Direct inline transform bypasses heavy CSS variable style recalculations
            if (glowElement) {
                glowElement.style.transform = `translate(calc(15% + ${dx.toFixed(2)}px), calc(-15% + ${dy.toFixed(2)}px))`;
            }
        }
        
        // Sync focal glow execution to 15fps (matches background canvas) to drastically reduce GPU/CPU compositor wakes
        setInterval(animateFocalGlow, 1000 / 15);
    }


    // ─── Lightweight Spring for cursor physics ───────────────────────
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
            let safeDt = Math.min(dt, 0.05);
            const ax = -this.stiffness * (this.px - this.targetX) - this.damping * this.vx;
            const ay = -this.stiffness * (this.py - this.targetY) - this.damping * this.vy;
            this.vx += ax * safeDt;
            this.vy += ay * safeDt;
            this.px += this.vx * safeDt;
            this.py += this.vy * safeDt;
        }
    }

    // ─── Custom Cursor (on-demand animation — no idle GPU cost) ──────
    const customCursor = document.getElementById('custom-cursor');
    const cursorSpring = new Spring(300, 28);
    const scaleSpring = new Spring(400, 30);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let animating = false;
    let prevTime = 0;

    scaleSpring.px = 1;
    scaleSpring.targetX = 1;

    function animateCursor(timestamp) {
        if (!prevTime) prevTime = timestamp;
        let dt = (timestamp - prevTime) / 1000;
        prevTime = timestamp;

        cursorSpring.setTarget(mouseX, mouseY);
        cursorSpring.update(dt || 0.016);
        scaleSpring.update(dt || 0.016);

        if (customCursor) {
            customCursor.style.transform = `translate(${cursorSpring.px}px, ${cursorSpring.py}px) translate(-50%, -50%) scale(${scaleSpring.px})`;
        }

        // Stop the loop once the spring has settled — no idle GPU compositing
        const vMag = Math.abs(cursorSpring.vx) + Math.abs(cursorSpring.vy) + Math.abs(scaleSpring.vx);
        const dMag = Math.abs(cursorSpring.px - mouseX) + Math.abs(cursorSpring.py - mouseY);
        if (vMag < 0.01 && dMag < 0.1) {
            animating = false;
            return;
        }

        requestAnimationFrame(animateCursor);
    }

    function kickCursorAnimation() {
        if (!animating) {
            animating = true;
            prevTime = 0;
            requestAnimationFrame(animateCursor);
        }
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        kickCursorAnimation();
    });

    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.custom-checkbox-label')) return;
        scaleSpring.setTarget(0.8, 0);
        kickCursorAnimation();
    });

    document.addEventListener('mouseup', (e) => {
        if (e.target.closest('.custom-checkbox-label')) return;
        scaleSpring.setTarget(1.0, 0);
        kickCursorAnimation();
    });

    // ─── Countdown Timer Logic ───────────────────────────────────────
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
        } else if (newValue === '0') {
            newDigit.classList.add('digit-zero');
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

    // ─── Custom Link Preview Logic ───────────────────────────────────
    const customLinkPreview = document.getElementById('custom-link-preview');
    const customLinks = document.querySelectorAll('[data-href]');

    if (customLinkPreview) {
        customLinks.forEach(link => {
            link.addEventListener('mouseenter', (e) => {
                const url = link.getAttribute('data-href');
                if (url) {
                    customLinkPreview.textContent = url;
                    customLinkPreview.classList.add('visible');
                }
            });

            link.addEventListener('mouseleave', () => {
                customLinkPreview.classList.remove('visible');
            });

            link.addEventListener('click', (e) => {
                if (link.id === 'btn-book-demo') return;
                const url = link.getAttribute('data-href');
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });
    }

    // ─── Book a Demo Sidebar Logic ───────────────────────────────────
    const btnBookDemo = document.getElementById('btn-book-demo');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const body = document.body;

    if (btnBookDemo) {
        const resetSidebar = () => {
            const demoForm = document.getElementById('demo-form');
            const demoSidebar = document.getElementById('demo-sidebar');
            if (demoForm) {
                demoForm.classList.remove('form-success');
                demoForm.reset();
            }
            if (demoSidebar) {
                demoSidebar.classList.remove('success-active');
            }
            if (typeof validateForm === 'function') {
                validateForm();
            }
        };

        const openSidebar = () => {
            if (!body.classList.contains('demo-active')) {
                body.classList.add('demo-active');
                // Push history state so back button works for closing
                history.pushState({ sidebar: 'demo' }, '', '#demo');
            }
        };

        const closeSidebar = (isPopState = false) => {
            if (body.classList.contains('demo-active')) {
                body.classList.remove('demo-active');
                setTimeout(resetSidebar, 600);
                
                // If closing via UI (not back button), go back in history
                if (!isPopState && window.location.hash === '#demo') {
                    history.back();
                }
            }
        };

        window.addEventListener('popstate', () => {
            // Close sidebar if back button is pressed (hash removed)
            if (body.classList.contains('demo-active') && window.location.hash !== '#demo') {
                closeSidebar(true);
            }
        });

        btnBookDemo.addEventListener('click', (e) => {
            e.preventDefault();
            if (body.classList.contains('demo-active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeSidebar();
            });
        }

        // Close sidebar when clicking outside the form area (Desktop only)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) return; // Disable on mobile/tablets per user request

            const sidebar = document.getElementById('demo-sidebar');
            if (body.classList.contains('demo-active') && 
                sidebar && !sidebar.contains(e.target) && 
                btnBookDemo && !btnBookDemo.contains(e.target)) {
                closeSidebar();
            }
        });

        // Close sidebar when clicking the logo (Mobile requirement)
        const gcpLogo = document.getElementById('gcp-logo');
        if (gcpLogo) {
            gcpLogo.addEventListener('click', () => {
                closeSidebar();
            });
        }

        // ─── Form Validation Logic ───
        const demoForm = document.getElementById('demo-form');
        const btnSubmit = document.getElementById('btn-submit');
        const inputs = demoForm ? demoForm.querySelectorAll('input[type="text"], input[type="email"]') : [];
        const checkbox = document.getElementById('demo-agree');

        if (demoForm && btnSubmit) {
            const validateForm = () => {
                let isValid = true;
                inputs.forEach(input => {
                    if (input.value.trim() === '') isValid = false;
                });
                if (checkbox && !checkbox.checked) isValid = false;

                if (isValid) {
                    btnSubmit.classList.remove('disabled');
                } else {
                    btnSubmit.classList.add('disabled');
                }
            };

            inputs.forEach(input => input.addEventListener('input', validateForm));
            if (checkbox) checkbox.addEventListener('change', validateForm);
            validateForm(); // initial check

            demoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                if (btnSubmit.classList.contains('disabled')) return;
                
                // Activate the success state via class (handles the opacity transition)
                demoForm.classList.add('form-success');
                
                // Shift the whole sidebar up slightly (handles the transform transition)
                const demoSidebar = document.getElementById('demo-sidebar');
                if (demoSidebar) {
                    demoSidebar.classList.add('success-active');
                }
                
                // Wipe the fields and re-validate (disables button)
                demoForm.reset();
                validateForm();
            });
        }
    }

    // ─── Mobile Team Overlay Logic ───
    const btnMeetTeam = document.getElementById('btn-meet-team');
    const employeeNamesList = document.getElementById('employee-names-list');

    if (btnMeetTeam && employeeNamesList) {
        // Toggle the overlay
        btnMeetTeam.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing it
            const isActive = employeeNamesList.classList.toggle('overlay-active');
            btnMeetTeam.classList.toggle('active', isActive);
        });

        // Close when clicking anywhere outside the overlay or trigger
        document.addEventListener('click', (e) => {
            // Only care if it's currently open
            if (employeeNamesList.classList.contains('overlay-active')) {
                // If they clicked outside both the overlay panel and the trigger button
                if (!employeeNamesList.contains(e.target) && !btnMeetTeam.contains(e.target)) {
                    employeeNamesList.classList.remove('overlay-active');
                    btnMeetTeam.classList.remove('active');
                }
            }
        });
        
        // Also close the team overlay if they open the Book a Demo sidebar
        if (btnBookDemo) {
            btnBookDemo.addEventListener('click', () => {
                employeeNamesList.classList.remove('overlay-active');
                btnMeetTeam.classList.remove('active');
            });
        }
    }

});
