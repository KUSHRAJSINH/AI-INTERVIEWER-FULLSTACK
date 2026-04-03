import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    UserPlus,
    ExternalLink,
    Mail,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    LogOut,
    ChevronRight,
    ClipboardList,
    XCircle,
    Trash2
} from "lucide-react";
import { getAdminInterviews, createAdminInterview, deleteAdminInterview } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";

interface InterviewRecord {
    id: number;
    session_id: string;
    candidate_name: string;
    resume: string;
    status: string;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [email, setEmail] = useState("");
    const [creating, setCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const data = await getAdminInterviews();
            setInterviews(data);
        } catch (err: any) {
            console.error(err);
            if (err.message === "Unauthorized") {
                toast({
                    title: "Session Expired",
                    description: "Please login again. Your access token is invalid or expired.",
                    variant: "destructive",
                });
                handleLogout();
                return;
            }
            toast({
                title: "Error",
                description: "Failed to load interviews",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (!token) {
            navigate("/");
            return;
        }
        setIsAuthenticated(true);
        fetchInterviews();
    }, [navigate]);

    const handleCreateInterview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        try {
            setCreating(true);
            const data = await createAdminInterview(email);

            // Handle success feedback
            if (data.link) {
                // Copy to clipboard
                navigator.clipboard.writeText(data.link);

                const mailSent = data.email_status === "sent";
                toast({
                    title: mailSent ? "Success & Copied" : "Invitation Created",
                    description: `${mailSent ? "Mail sent successfully" : ""}`,
                });
            } else {
                toast({
                    title: "Success",
                    description: "Interview invitation created successfully",
                });
            }

            setEmail("");
            fetchInterviews();
        } catch (err: any) {
            console.error(err);
            if (err.message === "Unauthorized") {
                toast({
                    title: "Session Expired",
                    description: "Please login again. Your access token is invalid or expired.",
                    variant: "destructive",
                });
                handleLogout();
                return;
            }
            toast({
                title: "Error",
                description: "Failed to create interview invitation",
                variant: "destructive",
            });
        } finally {
            setCreating(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user_role");
        localStorage.removeItem("admin_token");
        navigate("/");
    };

    const filteredInterviews = interviews.filter(i =>
        i.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toString().includes(searchTerm)
    );

    const handleDelete = async (inviteId: number, candidateName: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to permanently delete all data for "${candidateName}"?\n\nThis will remove:\n• Interview session & state\n• All questions & answers\n• Evaluation report\n• Invite link\n• Candidate record\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setDeletingId(inviteId);
            // Optimistic: remove from UI immediately
            setInterviews(prev => prev.filter(i => i.id !== inviteId));
            await deleteAdminInterview(inviteId);
            toast({
                title: "Deleted",
                description: `All data for "${candidateName}" has been permanently deleted.`,
            });
        } catch (err: any) {
            // Revert on failure
            fetchInterviews();
            toast({
                title: "Delete Failed",
                description: err.message || "Could not delete candidate data.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar / Header */}
            <header className="border-b border-border bg-card/60 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="font-bold text-xl text-gradient">Admin Dashboard</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Quick Actions / Create Interview */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="glass-card p-6 glow-border">
                            <div className="flex items-center gap-2 mb-4">
                                <UserPlus className="w-5 h-5 text-primary" />
                                <h2 className="font-bold">Create Interview</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Send an AI Interview invitation to a potential candidate.
                            </p>
                            <form onSubmit={handleCreateInterview} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Candidate Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="candidate@example.com"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-primary/50 transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={creating || !email}
                                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {creating ? <Clock className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    {creating ? "Generating..." : "Generate Invite Link"}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        {/* Stats / Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="glass-card p-6 border-primary/20 bg-primary/5">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total</p>
                                <p className="text-3xl font-bold">{interviews.length}</p>
                            </div>
                            <div className="glass-card p-6 border-muted-foreground/20 bg-white/5">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Pending</p>
                                <p className="text-3xl font-bold">{interviews.filter(i => i.status === 'pending').length}</p>
                            </div>
                            <div className="glass-card p-6 border-yellow-500/20 bg-yellow-500/5">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Ongoing</p>
                                <p className="text-3xl font-bold">{interviews.filter(i => i.status === 'ongoing').length}</p>
                            </div>
                            <div className="glass-card p-6 border-success/20 bg-success/5">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Completed</p>
                                <p className="text-3xl font-bold">{interviews.filter(i => i.status === 'completed').length}</p>
                            </div>
                        </div>

                        {/* Candidate Table */}
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 border-b border-border bg-white/5 flex items-center justify-between flex-wrap gap-4">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search candidate name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-primary/50 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={fetchInterviews}
                                        className="px-3 py-2 text-xs font-bold bg-primary/10 text-primary rounded-lg border border-primary/20"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Candidate</th>
                                            <th className="px-6 py-4 font-semibold">Resume</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                    <Clock className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                                                    Loading interview records...
                                                </td>
                                            </tr>
                                        ) : filteredInterviews.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                    No interview records found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredInterviews.map((record) => (
                                                <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                                                                {record.candidate_name?.[0]?.toUpperCase() || 'C'}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold">{record.candidate_name || `Interview #${record.id} `}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">ID: {record.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {record.resume ? (
                                                            <a
                                                                href={record.resume}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-primary hover:underline"
                                                            >
                                                                View PDF
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {record.status === 'completed' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-[10px] font-bold">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                COMPLETED
                                                            </span>
                                                        ) : record.status === 'closed' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-[10px] font-bold">
                                                                <XCircle className="w-3 h-3" />
                                                                CLOSED
                                                            </span>
                                                        ) : record.status === 'ongoing' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-500 text-[10px] font-bold animate-pulse">
                                                                <Clock className="w-3 h-3" />
                                                                ONGOING
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                                                                <Clock className="w-3 h-3" />
                                                                PENDING
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    localStorage.setItem("session_id", record.session_id);
                                                                    navigate("/evaluation");
                                                                }}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors"
                                                            >
                                                                View Report
                                                                <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(record.id, record.candidate_name || `#${record.id}`)}
                                                                disabled={deletingId === record.id}
                                                                title="Delete all candidate data"
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                                                            >
                                                                {deletingId === record.id
                                                                    ? <Clock className="w-3.5 h-3.5 animate-spin" />
                                                                    : <Trash2 className="w-3.5 h-3.5" />
                                                                }
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;
