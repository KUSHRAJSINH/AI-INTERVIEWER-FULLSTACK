import { useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, Home } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const ThankYou = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-20">
                <img src={heroBg} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />

            {/* Content card */}
            <div className="relative z-10 w-full max-w-lg glass-card p-12 text-center glow-border animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center mb-8 relative">
                    <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full" />
                    <div className="bg-primary/20 p-4 rounded-full relative">
                        <CheckCircle2 className="w-16 h-16 text-primary" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold mb-4 text-gradient">
                    Interview Complete.
                </h1>

                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                    Thank you for your time! Our team will reach out to you soon with updates via email.
                </p>

                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mb-10 bg-white/5 py-4 px-6 rounded-xl border border-white/10">
                    <Mail className="w-4 h-4 text-primary" />
                    We appreciate your interest in this position.
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate("/")}
                        className="w-full py-4 rounded-xl font-bold bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Home className="w-5 h-5" />
                        Back to Home
                    </button>

                    <p className="text-xs text-muted-foreground opacity-50">
                        You can safely close this window now.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ThankYou;
