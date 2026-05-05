document.addEventListener('DOMContentLoaded', () => {

    // ─── Premium Minimalist Loader ─────────
    const loader = document.getElementById('premium-loader');
    const loaderBar = document.querySelector('.loader-progress-bar');
    const bgVideo = document.getElementById('bg-video');
    let currentProgress = 3;
    let targetProgress = 85; // Initial target to reach slowly while loading
    let isAssetLoaded = false;
    
    function updateLoader() {
        if (currentProgress < 100) {
            let speed = 0;
            if (isAssetLoaded) {
                // Once asset is ready, move steadily to 100%
                speed = Math.max(0.4, (100 - currentProgress) * 0.1);
            } else {
                // While waiting, crawl towards targetProgress but never stop
                speed = (targetProgress - currentProgress) * 0.008 + 0.02;
            }
            
            currentProgress += speed;
            if (currentProgress > 100) currentProgress = 100;
            
            if (loaderBar) {
                loaderBar.style.width = `${currentProgress}%`;
            }
            
            if (currentProgress < 100) {
                requestAnimationFrame(updateLoader);
            } else {
                // Final check to ensure asset is actually ready before reveal
                if (isAssetLoaded) {
                    revealPage();
                }
            }
        }
    }
    
    function revealPage() {
        // Extra milliseconds for a premium feel
        setTimeout(() => {
            if (loader) {
                loader.classList.add('fade-out');
                document.body.classList.remove('loading-active');
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 800);
            }
        }, 500);
    }
    
    // Check if video is already loaded enough to play
    if (bgVideo) {
        if (bgVideo.readyState >= 3) {
            isAssetLoaded = true;
        } else {
            bgVideo.addEventListener('canplaythrough', () => {
                isAssetLoaded = true;
                if (currentProgress >= 100) {
                    revealPage();
                }
            }, { once: true });
        }
    } else {
        // Fallback if no video found
        isAssetLoaded = true;
    }

    // Start the animation loop immediately
    document.body.classList.add('loading-active');
    requestAnimationFrame(updateLoader);

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
    // Target: August 1, 2026 at 00:00:00 CEST (UTC+2)
    const COUNTDOWN_TARGET = new Date('2026-08-01T00:00:00+02:00').getTime();

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
        const now = Date.now();
        let remaining = Math.max(0, COUNTDOWN_TARGET - now);

        const totalSeconds = Math.floor(remaining / 1000);
        const days    = Math.floor(totalSeconds / 86400);
        const hours   = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const daysStr = formatDigit(days);
        const hoursStr = formatDigit(hours);
        const minutesStr = formatDigit(minutes);
        const secondsStr = formatDigit(seconds);

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

    tickCountdown(); // Render correct values immediately on load
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
                
                if (btnSubmit.classList.contains('disabled') || btnSubmit.classList.contains('loading')) return;
                
                // Set loading state
                btnSubmit.classList.add('loading');
                const originalBtnText = btnSubmit.innerText;
                btnSubmit.innerText = 'Sending...';
                demoForm.classList.remove('form-error');

                const formData = new FormData(demoForm);
                
                // Dynamically update from_name and subject for a better inbox experience
                const firstName = formData.get('First Name') || '';
                const lastName = formData.get('Last Name') || '';
                const company = formData.get('Company') || '';
                
                formData.set('from_name', `${firstName} ${lastName}`.trim() || 'xXenta Demo Request');
                formData.set('subject', `Demo Request: ${company} — ${firstName} ${lastName}`);
                
                // Ensure the "Reply" button in your email client works correctly
                const email = formData.get('Email');
                if (email) {
                    formData.set('replyto', email);
                }

                const object = Object.fromEntries(formData);
                const json = JSON.stringify(object);

                fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: json
                })
                .then(async (response) => {
                    let json = await response.json();
                    if (response.status == 200) {
                        // Activate the success state
                        demoForm.classList.add('form-success');
                        
                        const demoSidebar = document.getElementById('demo-sidebar');
                        if (demoSidebar) {
                            demoSidebar.classList.add('success-active');
                        }
                        
                        demoForm.reset();
                    } else {
                        console.log(response);
                        demoForm.classList.add('form-error');
                    }
                })
                .catch(error => {
                    console.log(error);
                    demoForm.classList.add('form-error');
                })
                .then(() => {
                    // Reset button state
                    btnSubmit.classList.remove('loading');
                    btnSubmit.innerText = originalBtnText;
                    validateForm();
                });
            });
        }
    }

    // ─── Mobile Team Overlay Logic ───
    const btnMeetTeam = document.getElementById('btn-meet-team');
    const employeeNamesList = document.getElementById('employee-names-list');

    if (btnMeetTeam && employeeNamesList) {
        // Toggle the overlay
        btnMeetTeam.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
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

    // ─── Trust Center Overlay Logic ───
    const btnTrust = document.getElementById('btn-trust');
    const btnTrustMobile = document.getElementById('btn-trust-mobile');
    const closeTrust = document.getElementById('close-trust');
    const trustOverlay = document.getElementById('trust-overlay');

    if (trustOverlay) {
        const openTrust = (e) => {
            if (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
            body.classList.add('trust-active');
            history.pushState({ overlay: 'trust' }, '', '#trust');
        };

        const hideTrust = (isPopState = false) => {
            body.classList.remove('trust-active');
            if (!isPopState && window.location.hash === '#trust') {
                history.back();
            }
        };

        if (btnTrust) btnTrust.addEventListener('click', (e) => {
            if (window.innerWidth > 1024) openTrust(e);
        });
        if (btnTrustMobile) btnTrustMobile.addEventListener('click', (e) => {
            if (body.classList.contains('demo-active')) openTrust(e);
        });
        if (closeTrust) closeTrust.addEventListener('click', () => hideTrust());

        // Close on background click
        trustOverlay.addEventListener('click', (e) => {
            if (e.target === trustOverlay) hideTrust();
        });

        // Sync with browser back button
        window.addEventListener('popstate', (e) => {
            if (body.classList.contains('trust-active') && window.location.hash !== '#trust') {
                hideTrust(true);
            }
        });
        
        // Also close other overlays if Trust is opened
        [btnTrust, btnTrustMobile].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (employeeNamesList) {
                        employeeNamesList.classList.remove('overlay-active');
                        btnMeetTeam.classList.remove('active');
                    }
                });
            }
        });
    }

});
