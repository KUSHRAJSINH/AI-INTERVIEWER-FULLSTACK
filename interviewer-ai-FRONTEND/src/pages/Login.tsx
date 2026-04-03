import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { adminLogin } from "@/services/api";
import heroBg from "@/assets/hero-bg.jpg";

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setLoading(true);
            setError("");
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const data = await adminLogin(formData);
            localStorage.setItem("admin_token", data.access_token);
            localStorage.setItem("user_role", "admin");
            navigate("/admin");
        } catch (err) {
            setError("Invalid admin credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 opacity-20">
                <img src={heroBg} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 glass-card border-primary/20">
                        <LogIn className="w-8 h-8 text-primary font-bold" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3 text-gradient">
                        InterviewAI Admin
                    </h1>
                    <p className="text-muted-foreground">
                        Sign in to access the dashboard
                    </p>
                </div>

                <div className="glass-card p-8 glow-border space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none transition-all text-sm"
                                placeholder="kushraj@logicrays.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none transition-all text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    </div>

                    <button
                        disabled={!email || !password || loading}
                        onClick={handleLogin}
                        className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform active:scale-[0.98] bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {loading ? "Logging in..." : "Login as Admin"}
                    </button>
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Secure, AI-powered recruitment platform
                </p>
            </div>
        </div>
    );
};

export default Login;
