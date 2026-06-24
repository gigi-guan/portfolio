document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    gsap.registerPlugin(ScrollTrigger);

    new SplitType('.hero-title', { types: 'chars' });

    gsap.from('.hero-eyebrow', {
        y: 12,
        opacity: 0,
        duration: 0.8,
        delay: 0.1,
        ease: 'power3.out'
    });

    gsap.from('.hero-title .char', {
        y: 100,
        opacity: 0,
        duration: 1.5,
        stagger: 0.05,
        delay: 0.2,
        ease: 'power4.out'
    });

    gsap.from('.hero-subtitle', {
        y: 20,
        opacity: 0,
        duration: 1,
        delay: 0.8,
        ease: 'power3.out'
    });

    gsap.from('.rake-hint', {
        y: 16,
        opacity: 0,
        duration: 0.9,
        delay: 1.4,
        ease: 'power3.out'
    });

    const rakeHint = document.getElementById('rake-hint');
    const zenRoot = document.getElementById('zen-three-root');
    if (rakeHint && zenRoot) {
        zenRoot.addEventListener('sand-raked', () => {
            rakeHint.classList.add('is-hidden');
        }, { once: true });
    }

    function initScrollAnimations() {
        const splitTitles = new SplitType('.section-title', { types: 'words, chars' });
        splitTitles.chars.forEach((char) => {
            gsap.from(char, {
                scrollTrigger: {
                    trigger: char.parentElement,
                    start: 'top 86%',
                },
                y: 36,
                opacity: 0,
                duration: 0.7,
                ease: 'power3.out'
            });
        });

        gsap.from('.section-intro', {
            scrollTrigger: { trigger: '.stone-path-section', start: 'top 82%' },
            y: 28,
            opacity: 0,
            duration: 0.95,
            ease: 'power3.out'
        });

        document.querySelectorAll('.stone-card').forEach((card, i) => {
            const isLeft = i % 2 === 1;
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 88%',
                },
                x: isLeft ? -48 : 48,
                y: 42,
                opacity: 0,
                duration: 1.05,
                ease: 'expo.out',
                delay: i * 0.04
            });

            gsap.from(card.querySelector('.stone-marker'), {
                scrollTrigger: { trigger: card, start: 'top 86%' },
                scaleX: 0.4,
                opacity: 0,
                duration: 0.7,
                ease: 'power2.out'
            });

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                gsap.to(card, {
                    y: -6,
                    rotateZ: x * 0.8,
                    transformPerspective: 1000,
                    duration: 0.5,
                    ease: 'power2.out'
                });

                const img = card.querySelector('.project-image img');
                if (img) {
                    gsap.to(img, {
                        xPercent: x * 2.4,
                        yPercent: y * 1.8,
                        scale: 1.045,
                        duration: 0.7,
                        ease: 'power2.out'
                    });
                }
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    y: 0,
                    rotateZ: 0,
                    duration: 0.55,
                    ease: 'power3.out'
                });
                const img = card.querySelector('.project-image img');
                if (img) {
                    gsap.to(img, {
                        xPercent: 0,
                        yPercent: 0,
                        scale: 1,
                        duration: 0.8,
                        ease: 'power3.out'
                    });
                }
            });
        });

        gsap.utils.toArray('.pavilion').forEach((panel, i) => {
            gsap.from(panel, {
                scrollTrigger: {
                    trigger: panel,
                    start: 'top 86%'
                },
                opacity: 0,
                y: 42,
                duration: 1,
                ease: 'expo.out',
                delay: i * 0.08
            });
        });

        gsap.from('.path-connector', {
            scrollTrigger: { trigger: '.path-connector', start: 'top 95%' },
            scaleY: 0,
            transformOrigin: 'top center',
            duration: 0.95,
            ease: 'power2.inOut'
        });
    }

    // Custom Cursor
    const cursorSystem = document.querySelector('.cursor-system');
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorRing = document.querySelector('.cursor-ring');
    const cursorBloom = document.querySelector('.cursor-bloom');
    const rippleLayer = document.querySelector('.cursor-ripple-layer');

    if (cursorSystem && cursorDot && cursorRing && cursorBloom && rippleLayer && !prefersReducedMotion.matches) {
        const state = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            ringX: window.innerWidth / 2,
            ringY: window.innerHeight / 2,
            bloomX: window.innerWidth / 2,
            bloomY: window.innerHeight / 2,
            lastX: window.innerWidth / 2,
            lastY: window.innerHeight / 2,
            visible: false,
            hovering: false,
            raking: false,
            rippleCooldown: 0,
            dotScale: 1,
            ringScale: 1,
            bloomScale: 1
        };

        const rippleAt = (x, y, scale = 1) => {
            const ripple = document.createElement('span');
            ripple.className = 'cursor-ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.transform = `scale(${0.35 * scale})`;
            rippleLayer.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
        };

        const setHoverState = (isHovering) => {
            state.hovering = isHovering;
            cursorSystem.classList.toggle('is-hover', isHovering);
            gsap.to(state, {
                ringScale: isHovering ? 1.42 : 1,
                bloomScale: isHovering ? 1.3 : 1,
                dotScale: isHovering ? 0.86 : 1,
                duration: 0.45,
                ease: 'power3.out'
            });
            gsap.to(cursorBloom, {
                opacity: isHovering ? 0.82 : 0.58,
                duration: 0.5,
                ease: 'power3.out'
            });
        };

        document.querySelectorAll('a, button, .btn, .stone-card, .project-card, .nav-links a').forEach((element) => {
            element.addEventListener('mouseenter', (event) => {
                setHoverState(true);
                rippleAt(event.clientX, event.clientY, 0.8);
            });
            element.addEventListener('mouseleave', () => setHoverState(false));
        });

        if (zenRoot) {
            zenRoot.addEventListener('pointerdown', (e) => {
                state.raking = true;
                cursorSystem.classList.add('is-pressed');
                rippleAt(e.clientX, e.clientY, 1.2);
            });
            zenRoot.addEventListener('pointerup', () => {
                state.raking = false;
                cursorSystem.classList.remove('is-pressed');
            });
        }

        document.addEventListener('pointermove', (event) => {
            state.x = event.clientX;
            state.y = event.clientY;
            if (!state.visible) {
                state.visible = true;
                cursorSystem.classList.add('is-visible');
            }
            const travel = Math.hypot(state.x - state.lastX, state.y - state.lastY);
            if (travel > 40 && state.rippleCooldown <= 0 && !state.raking) {
                rippleAt(state.x, state.y, 0.55);
                state.rippleCooldown = 8;
            }
            state.lastX = state.x;
            state.lastY = state.y;
        });

        document.addEventListener('pointerdown', (event) => {
            if (!state.raking) {
                rippleAt(event.clientX, event.clientY, 1);
            }
            gsap.to(state, {
                ringScale: state.hovering ? 1.18 : 0.9,
                bloomScale: state.hovering ? 1.14 : 0.92,
                duration: 0.2,
                ease: 'power2.out'
            });
            gsap.to(cursorBloom, { opacity: 0.95, duration: 0.2, ease: 'power2.out' });
        });

        document.addEventListener('pointerup', () => setHoverState(state.hovering));
        document.addEventListener('pointerleave', () => {
            state.visible = false;
            cursorSystem.classList.remove('is-visible');
        });
        window.addEventListener('blur', () => {
            state.visible = false;
            cursorSystem.classList.remove('is-visible');
        });

        const animateCursor = () => {
            state.ringX += (state.x - state.ringX) * 0.18;
            state.ringY += (state.y - state.ringY) * 0.18;
            state.bloomX += (state.x - state.bloomX) * 0.1;
            state.bloomY += (state.y - state.bloomY) * 0.1;
            state.rippleCooldown = Math.max(0, state.rippleCooldown - 1);
            const velocityX = state.x - state.ringX;
            const velocityY = state.y - state.ringY;
            const drift = Math.min(Math.hypot(velocityX, velocityY), 18);
            const angle = Math.atan2(velocityY, velocityX) * (180 / Math.PI);
            const rakeStretch = state.raking ? 1.8 : 1;
            gsap.set(cursorDot, { x: state.x, y: state.y, scale: state.dotScale });
            gsap.set(cursorRing, {
                x: state.ringX,
                y: state.ringY,
                rotate: state.raking ? angle : angle,
                scaleX: (1 + drift / 65) * state.ringScale * rakeStretch,
                scaleY: (1 - drift / 120) * state.ringScale * (state.raking ? 0.6 : 1)
            });
            gsap.set(cursorBloom, { x: state.bloomX, y: state.bloomY, scale: state.bloomScale });
            requestAnimationFrame(animateCursor);
        };
        animateCursor();
    }

    initScrollAnimations();
});
