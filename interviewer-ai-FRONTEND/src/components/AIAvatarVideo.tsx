import React, { useEffect, useRef, useState } from 'react';
import AudioVisualizer from './AudioVisualizer';

interface AIAvatarVideoProps {
    isSpeaking: boolean;
    isUserSpeaking?: boolean;
    analyser?: AnalyserNode | null;
    avatarUrl?: string;
}

const AIAvatarVideo: React.FC<AIAvatarVideoProps> = React.memo(({
    isSpeaking,
    isUserSpeaking,
    analyser,
    avatarUrl = "/pixar-robot.png"
}) => {
    const [isBlinking, setIsBlinking] = useState(false);
    const requestRef = useRef<number>(null);
    const mouthPathRef = useRef<SVGPathElement>(null);
    const mouthGlowRef = useRef<SVGEllipseElement>(null);

    // Dynamic audio level detection for lip-sync - Ref based to avoid re-renders
    useEffect(() => {
        if (!analyser || !isSpeaking) {
            if (mouthGlowRef.current) {
                mouthGlowRef.current.setAttribute('rx', '15');
                mouthGlowRef.current.setAttribute('ry', '2');
            }
            if (mouthPathRef.current) {
                mouthPathRef.current.setAttribute('d', 'M 32 25 Q 50 25 68 25');
            }
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            const startBin = Math.floor(bufferLength * 0.1);
            const endBin = Math.floor(bufferLength * 0.4);
            for (let i = startBin; i < endBin; i++) {
                sum += dataArray[i];
            }
            const average = sum / (endBin - startBin);
            const audioLevel = Math.min(1, Math.max(0, (average - 15) / 80));

            // Direct DOM manipulation for performance
            if (mouthGlowRef.current) {
                mouthGlowRef.current.setAttribute('rx', (15 + (audioLevel * 10)).toString());
                mouthGlowRef.current.setAttribute('ry', (2 + (audioLevel * 18)).toString());
            }
            if (mouthPathRef.current) {
                const w = 18 + audioLevel * 5;
                const h = 25 + audioLevel * 25;
                mouthPathRef.current.setAttribute('d', `M ${50 - w} 25 Q 50 ${h} ${50 + w} 25`);
            }

            requestRef.current = requestAnimationFrame(updateLevel);
        };

        requestRef.current = requestAnimationFrame(updateLevel);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [analyser, isSpeaking]);

    // Random blinking effect
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            if (Math.random() > 0.6) {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 100);
            }
        }, 2500);

        return () => clearInterval(blinkInterval);
    }, []);

    return (
        <div className="relative group w-48 mx-auto">
            <div className={`absolute -inset-6 bg-cyan-500/10 rounded-full blur-2xl transition-opacity duration-1000 ${isSpeaking ? 'opacity-100 scale-110' : 'opacity-40'}`}></div>

            <div className="relative glass-card overflow-hidden rounded-[2rem] border border-white/10 flex flex-col items-center bg-black/40 backdrop-blur-xl shadow-xl transition-all duration-500 hover:scale-[1.05] hover:border-white/20">
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-20">
                    <div className="w-full h-[1px] bg-cyan-400 absolute top-0 animate-scan shadow-[0_0_8px_#22d3ee]"></div>
                </div>

                <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-b from-transparent to-black/30 flex items-center justify-center">
                    <img
                        src={avatarUrl}
                        alt="AI Interviewer"
                        className={`w-full h-full object-cover transition-all duration-700 
                            ${isSpeaking ? 'brightness-110 scale-105' : 'animate-breath brightness-90 scale-100'}`}
                    />

                    <div className={`absolute top-[41.5%] left-[29.5%] w-[13.5%] h-[4.5%] bg-[#d1d5db] rounded-full transition-opacity duration-75 ${isBlinking ? 'opacity-100' : 'opacity-0'}`}></div>
                    <div className={`absolute top-[41.5%] right-[29.5%] w-[13.5%] h-[4.5%] bg-[#d1d5db] rounded-full transition-opacity duration-75 ${isBlinking ? 'opacity-100' : 'opacity-0'}`}></div>

                    <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-[22%] aspect-[2/1] flex items-center justify-center">
                        <svg viewBox="0 0 100 50" className="w-full h-full">
                            <ellipse
                                ref={mouthGlowRef}
                                cx="50" cy="25"
                                rx="15" ry="2"
                                fill="rgba(34, 211, 238, 0.4)"
                                className="blur-sm transition-all duration-75"
                            />
                            <path
                                ref={mouthPathRef}
                                d="M 32 25 Q 50 25 68 25"
                                stroke="#22d3ee"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                className="transition-all duration-75 shadow-[0_0_5px_#22d3ee]"
                            />
                        </svg>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]' : 'bg-white/20'}`}></span>
                        <span className="text-[7px] font-mono text-cyan-400 font-bold tracking-widest">ARI-V7</span>
                    </div>
                </div>

                <div className="w-full px-4 pb-4 pt-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-black text-white/90 uppercase tracking-tighter">Ari Interactive</h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="h-[1px] w-4 bg-cyan-500/50"></span>
                                <p className="text-[7px] text-cyan-400/80 font-bold uppercase tracking-[0.2em]">Synapse Sync</p>
                            </div>
                        </div>

                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'border-cyan-400 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-white/5'}`}>
                            <div className={`w-5 h-5 rounded-full border border-dashed text-[6px] flex items-center justify-center font-mono ${isSpeaking ? 'border-cyan-500 animate-spin-slow text-cyan-400' : 'text-white/10 border-white/5'}`}>
                                {isSpeaking ? 'OK' : '..'}
                            </div>
                        </div>
                    </div>

                    <div className="h-7 w-full rounded-xl bg-black/30 overflow-hidden px-2 py-1 border border-white/5">
                        <AudioVisualizer
                            isSpeaking={isSpeaking}
                            analyser={isUserSpeaking ? analyser : (isSpeaking ? analyser : null)}
                            color={isSpeaking ? '#22d3ee' : isUserSpeaking ? '#10b981' : '#6366f1'}
                            bars={25}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AIAvatarVideo;
