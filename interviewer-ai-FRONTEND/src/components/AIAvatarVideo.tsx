import React, { useEffect, useRef, useState } from 'react';
import AudioVisualizer from './AudioVisualizer';

interface AIAvatarVideoProps {
    isSpeaking: boolean;
    isUserSpeaking?: boolean;
    analyser?: AnalyserNode | null;
    avatarUrl?: string;
}

const AIAvatarVideo: React.FC<AIAvatarVideoProps> = ({
    isSpeaking,
    isUserSpeaking,
    analyser,
    avatarUrl = "/cartoon-robot-avatar.png"
}) => {
    const [audioLevel, setAudioLevel] = useState(0);
    const [isBlinking, setIsBlinking] = useState(false);
    const requestRef = useRef<number>(null);

    // Dynamic audio level detection for lip-sync
    useEffect(() => {
        if (!analyser || !isSpeaking) {
            setAudioLevel(0);
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            // Focus on speech frequency ranges (mid-range mostly)
            const startBin = Math.floor(bufferLength * 0.1);
            const endBin = Math.floor(bufferLength * 0.5);
            for (let i = startBin; i < endBin; i++) {
                sum += dataArray[i];
            }
            const average = sum / (endBin - startBin);

            // Apply a threshold and smoothing
            const level = Math.max(0, (average - 20) / 100);
            setAudioLevel(level);

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
            if (Math.random() > 0.7) {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 150);
            }
        }, 3000);

        return () => clearInterval(blinkInterval);
    }, []);

    return (
        <div className="relative group max-w-sm mx-auto">
            {/* Ambient Background Glow */}
            <div className={`absolute -inset-10 bg-blue-600/10 rounded-full blur-3xl transition-opacity duration-1000 ${isSpeaking ? 'opacity-100 scale-110' : 'opacity-30'}`}></div>

            <div className="relative glass-card overflow-hidden rounded-[2.5rem] border border-white/10 flex flex-col items-center bg-black/30 backdrop-blur-2xl shadow-2xl transition-transform duration-500 hover:scale-[1.02]">

                {/* HUD Scanning Line */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-30">
                    <div className="w-full h-[1px] bg-cyan-400 absolute top-0 animate-scan shadow-[0_0_10px_#22d3ee]"></div>
                </div>

                {/* Avatar Image Container */}
                <div className="relative w-full aspect-square flex items-center justify-center p-4">
                    <img
                        src={avatarUrl}
                        alt="AI Interviewer"
                        className={`w-full h-full object-contain transition-all duration-700 
                            ${isSpeaking ? 'brightness-110' : 'animate-breath opacity-90'}`}
                    />

                    {/* Animated Eye Overlays (for blinking) */}
                    <div className={`absolute top-[37%] left-[30.5%] w-[8%] h-[2.5%] bg-[#0f172a] rounded-full transition-opacity duration-75 ${isBlinking ? 'opacity-100' : 'opacity-0'}`}></div>
                    <div className={`absolute top-[37%] right-[30.5%] w-[8%] h-[2.5%] bg-[#0f172a] rounded-full transition-opacity duration-75 ${isBlinking ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* SVG MOUTH OVERLAY - REAL-TIME LIP SYNC */}
                    <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[18%] aspect-square flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Inner Mouth / Glow */}
                            <ellipse
                                cx="50" cy="50"
                                rx={20 + (audioLevel * 15)}
                                ry={2 + (audioLevel * 25)}
                                fill="rgba(34, 211, 238, 0.4)"
                                className="blur-sm transition-all duration-75"
                            />
                            {/* Mouth Line / Opening */}
                            <path
                                d={`M ${50 - (20 + audioLevel * 5)} 50 Q 50 ${50 + (audioLevel * 40)} ${50 + (20 + audioLevel * 5)} 50`}
                                stroke="#22d3ee"
                                strokeWidth="4"
                                fill="none"
                                strokeLinecap="round"
                                className="transition-all duration-75"
                            />
                            {/* Optional: Teeth / Tongue for more cartoon feel */}
                            <rect
                                x={50 - (10 * audioLevel)}
                                y="48"
                                width={20 * audioLevel}
                                height="2"
                                fill="white"
                                opacity={audioLevel > 0.3 ? 0.8 : 0}
                            />
                        </svg>
                    </div>

                    {/* HUD Decorations */}
                    <div className="absolute top-8 left-8 border-l border-t border-cyan-500/30 w-6 h-6 rounded-tl-lg"></div>
                    <div className="absolute bottom-8 right-8 border-r border-b border-cyan-500/30 w-6 h-6 rounded-br-lg"></div>
                </div>

                {/* Status Bar */}
                <div className="w-full px-8 pb-8 pt-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-black text-white tracking-widest uppercase italic">Nexus-9</h3>
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`}></span>
                                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.3em]">Synapse Active</p>
                            </div>
                        </div>

                        {/* Recursive Pulse Ring */}
                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'border-cyan-400/50 scale-110 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/5'}`}>
                            <div className={`w-8 h-8 rounded-full border border-dashed text-[8px] flex items-center justify-center font-mono ${isSpeaking ? 'border-cyan-500/50 animate-spin-slow' : 'border-white/5'}`}>
                                {isSpeaking ? 'SYNC' : 'IDLE'}
                            </div>
                        </div>
                    </div>

                    {/* Visualizer */}
                    <div className="h-12 w-full glass-card bg-black/20 overflow-hidden p-2">
                        <AudioVisualizer
                            isSpeaking={isSpeaking}
                            analyser={isUserSpeaking ? analyser : (isSpeaking ? analyser : null)}
                            color={isSpeaking ? '#22d3ee' : isUserSpeaking ? '#10b981' : '#6366f1'}
                            bars={30}
                        />
                    </div>
                </div>
            </div>

            {/* Data HUD Labels */}
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-8 opacity-20 group-hover:opacity-100 transition-opacity">
                <div className="rotate-[-90deg] text-[8px] font-mono whitespace-nowrap text-white">X-AXIS_CALIBRATED</div>
                <div className="rotate-[-90deg] text-[8px] font-mono whitespace-nowrap text-cyan-400">NEURAL_LINK_OK</div>
            </div>
        </div>
    );
};

export default AIAvatarVideo;
