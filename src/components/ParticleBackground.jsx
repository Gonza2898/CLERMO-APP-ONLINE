// Archivo: src/components/ParticleBackground.jsx
import React, { useEffect, useRef } from 'react';

export default function ParticleBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let particles = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
            constructor(x, y, dirX, dirY, size, color) {
                this.x = x; this.y = y; this.dirX = dirX; this.dirY = dirY; this.size = size; this.color = color;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.dirX = -this.dirX;
                if (this.y > canvas.height || this.y < 0) this.dirY = -this.dirY;
                this.x += this.dirX;
                this.y += this.dirY;
                this.draw();
            }
        }

        const initParticles = () => {
            particles = [];
            let numberOfParticles = (canvas.height * canvas.width) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 2) + 1;
                let x = (Math.random() * (innerWidth - size * 2));
                let y = (Math.random() * (innerHeight - size * 2));
                let dirX = (Math.random() * 0.4) - 0.2;
                let dirY = (Math.random() * 0.4) - 0.2;
                let color = 'rgba(52, 211, 153, 0.8)';
                particles.push(new Particle(x, y, dirX, dirY, size, color));
            }
        };

        let animationFrameId;
        const animateParticles = () => {
            animationFrameId = requestAnimationFrame(animateParticles);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            particles.forEach(p => p.update());
        };

        initParticles();
        animateParticles();

        // Limpieza al desmontar el componente
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // El array vacío asegura que esto se ejecute solo una vez

    return (
        <canvas 
            ref={canvasRef} 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0, // Lo ponemos detrás de todo
                opacity: 0.15,
            }}
        />
    );
}