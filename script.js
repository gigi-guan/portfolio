document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lenis Smooth Scroll
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

    // 2. Hero Animation
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

    gsap.from('.hero-cta', {
        y: 20,
        opacity: 0,
        duration: 1,
        delay: 1.0,
        ease: 'power3.out'
    });

    // 3. SplitType for Text Reveal on Scroll
    gsap.registerPlugin(ScrollTrigger);
    
    const splitTitles = new SplitType('.section-title', { types: 'chars' });
    splitTitles.chars.forEach((char) => {
        gsap.from(char, {
            scrollTrigger: {
                trigger: char.parentElement,
                start: "top 85%",
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: "back.out(1.7)",
            stagger: 0.05
        });
    });

    // 4. Advanced Parallax and Card Reveal
    // 5. 3D Tilt Hover Effects on Project Cards
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;
            
            gsap.to(card, {
                rotationX: rotateX,
                rotationY: rotateY,
                transformPerspective: 1000,
                duration: 0.5,
                ease: 'power1.out'
            });

            gsap.to(card.querySelector('.project-image img'), {
                scale: 1.05,
                duration: 0.8,
                ease: "power2.out"
            });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotationX: 0,
                rotationY: 0,
                duration: 0.5,
                ease: 'power3.out'
            });
            gsap.to(card.querySelector('.project-image img'), {
                scale: 1,
                duration: 0.8,
                ease: "power2.out"
            });
        });
    });

    // 7. Interactive Pixie Dust Canvas (Shopify Editions Vibe!)
    {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9998';

    const ctx = canvas.getContext('2d');
    let width, height;
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    document.addEventListener('mousemove', (e) => {
        if (Math.random() > 0.4) { 
            particles.push({
                x: e.clientX,
                y: e.clientY,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5 - 0.5,
                life: 1,
                color: `hsla(${180 + Math.random() * 80}, 100%, 70%, `,
                size: Math.random() * 3 + 1
            });
        }
    });

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for(let i = 0; i < particles.length; i++) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            ctx.fillStyle = p.color + p.life + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            if(p.life <= 0) {
                particles.splice(i, 1);
                i--;
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
    }

    // 6. Custom Magnetic Cursor
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    
    if(cursor && follower) {
        let posX = 0, posY = 0;
        let mouseX = 0, mouseY = 0;
        
        gsap.to({}, 0.016, {
            repeat: -1,
            onRepeat: () => {
                posX += (mouseX - posX) / 9;
                posY += (mouseY - posY) / 9;
                gsap.set(follower, {
                    css: { left: posX - 10, top: posY - 10 }
                });
                gsap.set(cursor, {
                    css: { left: mouseX, top: mouseY }
                });
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        document.querySelectorAll('a, .btn, .project-card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                gsap.to(cursor, { scale: 0, opacity: 0, duration: 0.2 });
                gsap.to(follower, { scale: 3, backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.5)', duration: 0.3 });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(cursor, { scale: 1, opacity: 1, duration: 0.2 });
                gsap.to(follower, { scale: 1, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.3)', duration: 0.3 });
            });
        });
    }

    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 85%",
            },
            y: 100,
            opacity: 0,
            duration: 1.2,
            ease: "expo.out",
            delay: (i % 2) * 0.1 
        });

        // Image Parallax inside card
        const img = card.querySelector('.project-image');
        if(img) {
            gsap.fromTo(img, 
                { y: -20 },
                {
                    y: 20,
                    ease: "none",
                    scrollTrigger: {
                        trigger: card,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: true
                    }
                }
            );
        }
    });

    // Reveal for About & Contact
    gsap.from('.about-content', {
        scrollTrigger: { trigger: '.about-section', start: "top 80%" },
        y: 50, opacity: 0, duration: 1, ease: "expo.out"
    });
    
    gsap.from('.contact-content', {
        scrollTrigger: { trigger: '.contact-section', start: "top 80%" },
        y: 50, opacity: 0, duration: 1, ease: "expo.out"
    });

    // 8. Ambient Background Canvas
    {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.position = 'fixed';
    bgCanvas.style.top = '0';
    bgCanvas.style.left = '0';
    bgCanvas.style.width = '100vw';
    bgCanvas.style.height = '100vh';
    bgCanvas.style.pointerEvents = 'none';
    bgCanvas.style.zIndex = '-1';
    document.querySelector('.ambient-background').appendChild(bgCanvas);
    const ctx = bgCanvas.getContext('2d');

    let width, height;

    function resize() {
        width = bgCanvas.width = window.innerWidth;
        height = bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    for(let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.1,
            dy: (Math.random() - 0.5) * 0.1,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.03 + 0.005
        });
    }

    let time = 0;
    function animateBackground() {
        ctx.clearRect(0, 0, width, height);
        time += 0.003;

        // Soft abstract golden/accent waves at bottom
        ctx.fillStyle = 'rgba(210, 106, 41, 0.06)'; 
        ctx.beginPath();
        ctx.moveTo(0, height);
        for(let x = 0; x <= width; x += 10) {
            let y = height * 0.5 + Math.sin(x * 0.001 + time) * 150 + Math.sin(x * 0.003 - time * 1.5) * 60;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.fill();

        ctx.fillStyle = 'rgba(140, 119, 98, 0.05)'; 
        ctx.beginPath();
        ctx.moveTo(0, height);
        for(let x = 0; x <= width; x += 10) {
            let y = height * 0.65 + Math.sin(x * 0.002 - time) * 120 + Math.sin(x * 0.005 + time * 1.2) * 40;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.fill();

        // Draw sparkles
        particles.forEach(p => {
            p.phase += p.speed;
            p.x += p.dx;
            p.y += p.dy;
            
            if(p.x < 0) p.x = width;
            if(p.x > width) p.x = 0;
            if(p.y < 0) p.y = height;
            if(p.y > height) p.y = 0;

            let alpha = (Math.sin(p.phase) + 1) / 2;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(210, 106, 41, ${alpha * 0.7})`;
            ctx.fill();
            
            // Little ray/cross for bright sparkles
            if (alpha > 0.8) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(alpha - 0.8) * 2.5})`;
                ctx.fillRect(p.x - p.r * 2, p.y - 0.5, p.r * 4, 1);
                ctx.fillRect(p.x - 0.5, p.y - p.r * 2, 1, p.r * 4);
            }
        });

        requestAnimationFrame(animateBackground);
    }
    animateBackground();
    }
});
