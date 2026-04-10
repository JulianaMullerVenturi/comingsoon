document.addEventListener('DOMContentLoaded', () => {

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

    // ─── Custom Cursor ───────────────────────────────────────────────
    const customCursor = document.getElementById('custom-cursor');
    const cursorSpring = new Spring(300, 28);
    const scaleSpring = new Spring(400, 30);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    scaleSpring.px = 1;
    scaleSpring.targetX = 1;

    document.addEventListener('mousedown', () => {
        scaleSpring.setTarget(0.8, 0);
    });

    document.addEventListener('mouseup', () => {
        scaleSpring.setTarget(1.0, 0);
    });

    let prevTime = 0;
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

        requestAnimationFrame(animateCursor);
    }

    requestAnimationFrame(animateCursor);

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
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
