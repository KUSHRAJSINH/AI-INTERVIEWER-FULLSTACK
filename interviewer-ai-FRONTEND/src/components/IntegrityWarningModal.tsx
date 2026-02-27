import { AlertTriangle, X } from "lucide-react";

interface IntegrityWarningModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const IntegrityWarningModal = ({ open, onClose, reason = "Tab switch or window blur detected" }: IntegrityWarningModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border-2 border-destructive/50 bg-card p-8 shadow-2xl" style={{ boxShadow: "0 0 40px hsl(0 72% 51% / 0.2)" }}>
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">Integrity Warning</h2>
        <p className="text-muted-foreground mb-2">Suspicious activity has been detected during your interview session.</p>
        
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm font-medium text-destructive">{reason}</p>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          This incident has been logged and will be included in your integrity report. Repeated violations may result in interview termination.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:brightness-110 transition-all"
        >
          I Understand — Continue
        </button>
      </div>
    </div>
  );
};

export default IntegrityWarningModal;
