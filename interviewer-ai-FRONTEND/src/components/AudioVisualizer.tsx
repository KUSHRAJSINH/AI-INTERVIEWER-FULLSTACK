import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    analyser?: AnalyserNode | null;
    isSpeaking?: boolean;
    color?: string;
    bars?: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    analyser,
    isSpeaking = false,
    color = '#3b82f6',
    bars = 40
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser?.frequencyBinCount || bars;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            if (analyser) {
                analyser.getByteFrequencyData(dataArray);
            } else if (isSpeaking) {
                // Fake animation for SpeechSynthesis
                for (let i = 0; i < bars; i++) {
                    dataArray[i] = 20 + Math.random() * 80;
                }
            } else {
                // Heartbeat / Idle
                for (let i = 0; i < bars; i++) {
                    dataArray[i] = 10 + Math.sin(Date.now() / 200 + i / 5) * 5;
                }
            }

            const barWidth = (width / bars) * 1.5;
            let x = 0;

            for (let i = 0; i < bars; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.8 + 2;

                const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, `${color}bb`);

                ctx.fillStyle = gradient;

                // Rounded bar
                const r = 4;
                const y = height / 2 - barHeight / 2;

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth - 2, barHeight, r);
                } else {
                    ctx.rect(x, y, barWidth - 2, barHeight);
                }
                ctx.fill();

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
};

export default AudioVisualizer;
