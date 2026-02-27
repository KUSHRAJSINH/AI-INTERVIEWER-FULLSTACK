import React from 'react';
import AudioVisualizer from './AudioVisualizer';

interface AIAvatarProps {
    isSpeaking: boolean;
    isUserSpeaking?: boolean;
    analyser?: AnalyserNode | null;
    avatarUrl?: string;
}

const AIAvatar: React.FC<AIAvatarProps> = ({
    isSpeaking,
    isUserSpeaking,
    analyser,
    avatarUrl = "/ai-avatar.png" // Fallback if image generation fails or user wants to customize
}) => {
    return (
        <div className="relative group">
            {/* Glow Effect */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 ${isSpeaking ? 'animate-pulse opacity-50' : ''}`}></div>

            <div className="relative glass-card overflow-hidden rounded-2xl border border-white/10 flex flex-row items-center p-3 gap-4">
                {/* Avatar Image */}
                <div className="w-24 h-24 relative flex-shrink-0">
                    <img
                        src={avatarUrl}
                        alt="AI Interviewer"
                        className={`w-full h-full object-contain transition-transform duration-500 ${isSpeaking ? 'scale-105' : 'scale-100'}`}
                    />

                    {/* Status Indicator */}
                    <div className="absolute bottom-1 right-1 flex gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-blue-500 animate-ping' : 'bg-gray-400'}`}></span>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-blue-400' : 'bg-gray-500'}`}></span>
                    </div>
                </div>

                {/* Info & Wave Container */}
                <div className="flex flex-col flex-1 min-w-0 h-24">
                    <div className="text-left mb-1">
                        <h3 className="text-sm font-semibold text-white/90">AI Interviewer</h3>
                        <p className="text-[10px] text-blue-400 font-medium tracking-widest uppercase">Active Evaluation</p>
                    </div>

                    {/* Speech Wave */}
                    <div className="w-full mt-auto">
                        <AudioVisualizer
                            isSpeaking={isSpeaking}
                            analyser={isUserSpeaking ? analyser : null}
                            color={isSpeaking ? '#3b82f6' : isUserSpeaking ? '#10b981' : '#6366f1'}
                            bars={25}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAvatar;
