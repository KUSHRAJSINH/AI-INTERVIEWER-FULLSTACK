import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Download,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Evaluation = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const sessionId = localStorage.getItem("session_id");
      if (!sessionId) return;

      try {
        const formData = new FormData();
        formData.append("session_id", sessionId);

        const response = await fetch(
          "http://localhost:8000/api/final-report",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();
        setReport(data.report); 
      } catch (err) {
        console.error("Failed to fetch report:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-lg px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-lg text-gradient">
            InterviewAI
          </h1>
          <button
            onClick={() => {
              localStorage.removeItem("session_id");
              navigate("/");
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            New Interview
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Interview Evaluation
        </h2>

        <div className="glass-card p-8 glow-border">
          {loading ? (
            <p className="text-center text-muted-foreground">
              Generating AI Evaluation...
            </p>
          ) : (
            <div className="prose prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-center mt-8">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-110"
          >
            <Download className="w-5 h-5" />
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Evaluation;
