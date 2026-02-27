import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Camera, Mic, CheckCircle, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { startInterview } from "@/services/api";

const ResumeUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") {
      setFile(selected);
    }
  };

  const testDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCameraOk(true);
      setMicOk(true);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setCameraOk(false);
      setMicOk(false);
    }
  };

  const handleStartInterview = async () => {
    if (!file) return;

    try {
      setLoading(true);

      const data = await startInterview(file);

      localStorage.setItem("session_id", data.session_id);

      navigate("/interview", {
        state: {
          question: data.question,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const canStart = file && cameraOk && micOk && !loading;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />

      <div className="relative z-10 min-h-screen items-center justify-center px-4 flex flex-col">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 text-gradient">
            InterviewAI
          </h1>
          <p className="text-muted-foreground">
            Upload your resume and complete your technical interview
          </p>
        </div>

        <div className="w-full max-w-lg glass-card p-8 glow-border">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${isDragging
                ? "border-primary bg-primary/10"
                : file
                  ? "border-success/50 bg-success/5"
                  : "border-border hover:border-primary/50"
              }
            `}
            onClick={() =>
              document.getElementById("file-input")?.click()
            }
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle className="w-7 h-7 text-success" />
                <p className="font-semibold">{file.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-7 h-7 text-primary" />
                <p className="font-semibold">
                  Drop your resume here (PDF)
                </p>
              </div>
            )}
          </div>

          <button
            onClick={testDevices}
            className="mt-6 w-full py-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80"
          >
            Test Camera & Microphone
          </button>

          <button
            disabled={!canStart}
            onClick={handleStartInterview}
            className={`mt-6 w-full py-4 rounded-xl font-semibold transition-all
              ${canStart
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {loading ? "Starting..." : "Start Interview"}
            <ArrowRight className="inline ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
