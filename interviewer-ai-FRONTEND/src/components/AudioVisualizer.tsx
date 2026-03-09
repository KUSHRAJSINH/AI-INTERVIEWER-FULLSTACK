import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    analyser?: AnalyserNode | null;
    isSpeaking?: boolean;
    color?: string;
    bars?: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = React.memo(({
    analyser,
    isSpeaking = false,
    color = '#3b82f6',
    bars = 40
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const gradientRef = useRef<CanvasGradient | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // Performance optimization
        if (!ctx) return;

        // Pre-create gradient if possible or reset when color changes
        const width = canvas.width;
        const height = canvas.height;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}bb`);
        gradientRef.current = gradient;

        const bufferLength = analyser?.frequencyBinCount || bars;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            ctx.fillStyle = '#0a0a0a'; // Match card background or clear color
            ctx.fillRect(0, 0, width, height);

            if (analyser) {
                analyser.getByteFrequencyData(dataArray);
            } else if (isSpeaking) {
                for (let i = 0; i < bars; i++) {
                    dataArray[i] = 20 + Math.random() * 80;
                }
            } else {
                for (let i = 0; i < bars; i++) {
                    dataArray[i] = 10 + Math.sin(Date.now() / 200 + i / 5) * 5;
                }
            }

            const barWidth = (width / bars) * 1.5;
            let x = 0;

            ctx.fillStyle = gradientRef.current || color;

            for (let i = 0; i < bars; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.8 + 2;
                const y = height / 2 - barHeight / 2;

                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth - 2, barHeight, 4);
                    ctx.fill();
                } else {
                    ctx.fillRect(x, y, barWidth - 2, barHeight);
                }

                x += barWidth;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isSpeaking, color, bars]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-16 opacity-80"
            width={400}
            height={100}
        />
    );
});

export default AudioVisualizer;
