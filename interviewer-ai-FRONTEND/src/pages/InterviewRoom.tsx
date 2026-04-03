import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, Mic, Square, Shield, User, MessageSquare } from "lucide-react";
import { submitAnswer, transcribeAudio, reportCheat, visionCheck, closeInterview } from "@/services/api";
import { FaceLandmarker, FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import AIAvatarVideo from "@/components/AIAvatarVideo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const InterviewRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const sessionId = localStorage.getItem("session_id");

  // ---------------- STATE ----------------
  const [question, setQuestion] = useState<string>(
    location.state?.question || ""
  );
  const [violationCount, setViolationCount] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [faceStatus, setFaceStatus] = useState<
    "ok" | "none" | "multiple" | "looking_away" | "phone_detected"
  >("ok");
  const [integrityScore, setIntegrityScore] = useState(100);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [isFaceDetectionEnabled, setIsFaceDetectionEnabled] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [phoneUseCaseCount, setPhoneUseCaseCount] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // ---------------- FACE DETECTION REFS ----------------
  const lastFaceDetectedRef = useRef<number>(Date.now());
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const requestRef = useRef<number>();

  // ---------------- AUTO VOICE DETECTION REFS ----------------
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialAnswerRef = useRef<string>("");
  const initialAnswerStateRef = useRef<string>("");
  const isSupposedToBeRecordingRef = useRef<boolean>(false);
  const currentSessionIdRef = useRef<number>(0);

  // ---------------- PHONE TRACKING REFS ----------------
  const phoneStartTimeRef = useRef<number | null>(null);
  const phoneUseCaseRecordedRef = useRef<boolean>(false);
  const loopLoggedRef = useRef<boolean>(false);

  // ---------------- CHEAT REPORT ----------------
  const handleCheat = useCallback(async (reason: string) => {
    if (!sessionId) return;

    // Show immediate popup alert
    setAlertMessage(reason);
    setTimeout(() => setAlertMessage(null), 3000);

    try {
      const data = await reportCheat(sessionId, reason);
      setViolationCount((prev) => prev + 1);

      if (data.current_cheat_score !== undefined) {
        const calculatedScore = 100 - data.current_cheat_score * 10;
        setIntegrityScore(Math.max(0, calculatedScore));
      }

      /* 
      if (data.terminated) {
        alert("Interview terminated due to multiple violations.");
        navigate("/evaluation");
      }
      */
    } catch (err) {
      console.error("Cheat reporting failed", err);
    }
  }, [sessionId, navigate]);

  // ---------------- TAB + COPY DETECTION ----------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) handleCheat("Tab switch detected");
    };

    const handleBlur = () => {
      handleCheat("Window focus lost");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleCheat("Copy attempt detected");
    };

    const handlePaste = (e: ClipboardEvent) => {
      handleCheat("Paste attempt detected");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [handleCheat]);

  // ---------------- TAB CLOSURE DETECTION ----------------
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId) {
        const formData = new FormData();
        formData.append("session_id", sessionId);
        // Use keepalive to ensure the request completes after tab is closed
        fetch("http://localhost:8000/api/close-interview", {
          method: "POST",
          body: formData,
          keepalive: true,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId]);

  useEffect(() => {
    if (integrityScore <= 10) {
      console.warn("Integrity score critically low. Warning shown.");
      setAlertMessage("WARNING: Integrity Score Critically Low!");
      setTimeout(() => setAlertMessage(null), 5000);
    }
  }, [integrityScore, navigate]);

  useEffect(() => {
    if (phoneUseCaseCount >= 5) {
      console.warn("Frequent phone usage detected. Warning shown.");
      setAlertMessage("WARNING: Unusual Activity Detected!");
      setTimeout(() => setAlertMessage(null), 5000);
    }
  }, [phoneUseCaseCount, navigate]);

  // ---------------- SPEECH SYNTHESIS ----------------
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setVoicesLoaded(true);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // ---------------- RECORDING HELPERS ----------------
  const cleanupRecording = useCallback(() => {
    // 1. Stop Speech Recognition immediately
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch (e) { }
      recognitionRef.current = null;
    }

    // 2. Stop Media Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) { }
    }

    // 3. Stop Animation & Silence Timers
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // 4. Kill Audio Context & Stream Tracks 
    // This is crucial for hardware release
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error);
      }
      audioContextRef.current = null;
    }

    setIsRecording(false);
  }, []);

  const speakQuestion = useCallback((text: string) => {
    if (!text || !voicesLoaded) return;

    // IMPORTANT: Clear recording intent and clean up hardware
    isSupposedToBeRecordingRef.current = false;
    cleanupRecording();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.name.toLowerCase().includes("google") &&
          v.lang.startsWith("en")
      ) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsAISpeaking(true);
    utterance.onend = () => {
      setIsAISpeaking(false);
      // Safety buffer: Wait for synthesis to fully release audio pipeline
      setTimeout(() => {
        isSupposedToBeRecordingRef.current = true;
        startAutoRecording();
      }, 800);
    };

    utterance.onerror = () => setIsAISpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voicesLoaded, cleanupRecording]);

  useEffect(() => {
    if (question && voicesLoaded) {
      speakQuestion(question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, voicesLoaded]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // ---------------- CAMERA ----------------
  useEffect(() => {
    const constraints = {
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      }
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsFaceDetectionEnabled(true);
          };
        }
      })
      .catch((err) => {
        console.error("Camera access failed", err);
      });

    const currentVideo = videoRef.current;
    return () => {
      if (currentVideo?.srcObject) {
        const tracks = (currentVideo.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  // ---------------- FACE DETECTION ----------------
  useEffect(() => {
    if (!isFaceDetectionEnabled || !videoRef.current) return;

    let lastFaceDetectionTime = 0;
    let lastObjectDetectionTime = 0;
    const FACE_INTERVAL = 500;   // 2 times per second
    const OBJECT_INTERVAL = 1500; // once every 1.5 seconds

    const phoneCooldownRef = { current: 0 };
    const lookAwayCooldownRef = { current: 0 };
    const noFaceCooldownRef = { current: 0 };
    const multiFaceCooldownRef = { current: 0 };

    const setupDetection = async () => {
      console.log("[Proctor] Starting initialization...");
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU", // Offload to GPU
          },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFacialTransformationMatrixes: true,
        });

        objectDetectorRef.current = await ObjectDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.task",
            delegate: "GPU", // Offload to GPU
          },
          runningMode: "VIDEO",
          scoreThreshold: 0.25,
          maxResults: 5,
        });

        predictWebcam();
      } catch (err) {
        console.error("[Proctor] Initialization failed:", err);
        setTimeout(setupDetection, 5000);
      }
    };

    const predictWebcam = () => {
      if (!videoRef.current || !faceLandmarkerRef.current || !objectDetectorRef.current || videoRef.current.readyState !== 4) {
        requestRef.current = window.setTimeout(predictWebcam, 500);
        return;
      }

      const now = Date.now();
      const startTimeMs = performance.now();
      let currentStatus: typeof faceStatus = "ok";

      // --- 1. FACE DETECTION (PITCH/YAW/COUNT) ---
      if (now - lastFaceDetectionTime >= FACE_INTERVAL) {
        lastFaceDetectionTime = now;
        const faceResults = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

        if (!faceResults.faceLandmarks || faceResults.faceLandmarks.length === 0) {
          currentStatus = "none";
          if (now > noFaceCooldownRef.current) {
            noFaceCooldownRef.current = now + 5000;
            setIntegrityScore((prev) => Math.max(0, prev - 2));
            handleCheat("No face detected");
          }
        } else if (faceResults.faceLandmarks.length > 1) {
          currentStatus = "multiple";
          if (now > multiFaceCooldownRef.current) {
            multiFaceCooldownRef.current = now + 5000;
            setIntegrityScore((prev) => Math.max(0, prev - 4));
            handleCheat("Multiple faces detected");
          }
        } else if (faceResults.facialTransformationMatrixes?.[0]) {
          const matrix = faceResults.facialTransformationMatrixes[0].data;
          const yaw = Math.abs(Math.atan2(matrix[2], matrix[10]) * (180 / Math.PI));
          const pitch = Math.abs(Math.atan2(-matrix[6], matrix[10]) * (180 / Math.PI));

          if (yaw > 20 || pitch > 20) {
            currentStatus = "looking_away";
            if (now > lookAwayCooldownRef.current) {
              lookAwayCooldownRef.current = now + 4000;
              handleCheat("Looking away from screen / Focus lost");
            }
          }
        }
        setFaceStatus(currentStatus);
      }

      // --- 2. OBJECT DETECTION (MOBILE PHONE) ---
      if (now - lastObjectDetectionTime >= OBJECT_INTERVAL) {
        lastObjectDetectionTime = now;
        const objectResults = objectDetectorRef.current.detectForVideo(videoRef.current, startTimeMs);

        const phoneDetected = objectResults.detections.some((d) =>
          d.categories.some(
            (c) => (c.categoryName === "cell phone" || c.categoryName === "phone" || c.categoryName === "mobile phone") && c.score > 0.25
          )
        );

        if (phoneDetected) {
          setFaceStatus("phone_detected");
          if (!phoneStartTimeRef.current) {
            phoneStartTimeRef.current = now;
            phoneUseCaseRecordedRef.current = false;
          } else {
            const duration = now - phoneStartTimeRef.current;
            if (duration >= 3000 && !phoneUseCaseRecordedRef.current) {
              setPhoneUseCaseCount((prev) => prev + 1);
              phoneUseCaseRecordedRef.current = true;
              handleCheat("Persistent mobile phone usage");
            }
          }

          if (now > phoneCooldownRef.current) {
            phoneCooldownRef.current = now + 5000;
            handleCheat("Mobile phone detected");
          }
        } else {
          phoneStartTimeRef.current = null;
          phoneUseCaseRecordedRef.current = false;
        }
      }

      // Use setTimeout instead of requestAnimationFrame to yield back to the browser
      requestRef.current = window.setTimeout(predictWebcam, 200);
    };

    setupDetection();

    return () => {
      if (requestRef.current) clearTimeout(requestRef.current);
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
      if (objectDetectorRef.current) objectDetectorRef.current.close();
    };
  }, [isFaceDetectionEnabled, handleCheat]);

  // ---------------- BACKEND VISION CHECK LOOP ----------------
  useEffect(() => {
    if (!sessionId || !isFaceDetectionEnabled) return;

    // Reuse a single canvas for all vision checks
    const canvas = document.createElement("canvas");

    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob || !sessionId) return;
        try {
          const result = await visionCheck(sessionId, blob);

          if (result.cheat_score !== undefined) {
            const calculatedScore = 100 - result.cheat_score * 10;
            setIntegrityScore(Math.max(0, calculatedScore));
          }

          if (result.new_violations && result.new_violations.length > 0) {
            setAlertMessage(result.new_violations[0]);
            setTimeout(() => setAlertMessage(null), 3000);
            setViolationCount((prev) => prev + result.new_violations.length);
          }

          if (result.phone_detected) {
            setFaceStatus("phone_detected");
          }
        } catch (err) {
          console.error("Backend vision check failed", err);
        }
      }, "image/jpeg", 0.6); // Reduced quality for speed

    }, 4000); // 4 second interval

    return () => clearInterval(interval);
  }, [sessionId, isFaceDetectionEnabled]);

  // ---------------- RESILIENT & HYBRID RECORDING ----------------
  const startAutoRecording = async () => {
    if (isRecording) return;

    // Increment session ID to isolate this run
    currentSessionIdRef.current += 1;
    const thisSessionId = currentSessionIdRef.current;

    isSupposedToBeRecordingRef.current = true;
    initialAnswerStateRef.current = answer;

    // Hardware stabilization delay (ensures previous hardware release is complete)
    await new Promise(resolve => setTimeout(resolve, 100));

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access denied or failed", err);
      setIsRecording(false);
      isSupposedToBeRecordingRef.current = false;
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0)
        audioChunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      // Clean up internal timers but keep the 'isRecording' state until sync finish if needed
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

      try {
        // HYBRID SYNC: Only update if we are still in the same logical session
        console.log(`Syncing session ${thisSessionId} with Whisper...`);
        const data = await transcribeAudio(blob);

        if (currentSessionIdRef.current === thisSessionId && data?.text) {
          const cleanText = data.text.trim();
          if (cleanText.length > 1) {
            setAnswer(
              initialAnswerStateRef.current.trim()
                ? initialAnswerStateRef.current.trim() + " " + cleanText
                : cleanText
            );
          }
        } else {
          console.log("Discarding late accuracy sync from old session.");
        }
      } catch (err) {
        console.error("Whisper sync failed", err);
      }

      // Cleanup tracks
      stream.getTracks().forEach((t) => t.stop());
      if (audioContext.state !== "closed") audioContext.close();
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    // --- BROWSER STT: Live Feedback ---
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const startBrowserSTT = () => {
      if (!SpeechRecognition || !isSupposedToBeRecordingRef.current) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        // Only process results for the current session
        if (currentSessionIdRef.current !== thisSessionId) return;

        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }

        if (finalTranscript || interimTranscript) {
          const fullTranscript = (finalTranscript + interimTranscript).trim();
          setAnswer(
            initialAnswerStateRef.current.trim()
              ? initialAnswerStateRef.current.trim() + " " + fullTranscript
              : fullTranscript
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Recognition Error:", event.error);
        if (isSupposedToBeRecordingRef.current && (event.error === 'network' || event.error === 'no-speech')) {
          setTimeout(startBrowserSTT, 1000);
        }
      };

      recognition.onend = () => {
        // If we should still be recording, auto-restart to fix timeouts
        if (isSupposedToBeRecordingRef.current) {
          try { recognition.start(); } catch (e) { setTimeout(startBrowserSTT, 200); }
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.error("Failed to start Recognition", e);
      }
    };

    startBrowserSTT();

    const monitorAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (volume > 25) {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      } else {
        // We do NOT stop correctly here anymore, we stay active
        if (!silenceTimeoutRef.current) {
          silenceTimeoutRef.current = setTimeout(() => {
            console.log("User is silent - keeping listener hot.");
          }, 10000);
        }
      }
      animationRef.current = requestAnimationFrame(monitorAudio);
    };

    monitorAudio();
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    if (!answer.trim() || !sessionId) return;

    try {
      setLoading(true);
      const data = await submitAnswer(sessionId, answer);

      if (data.status === "completed") {
        navigate("/thank-you");
      } else {
        setQuestion(data.question);
        setAnswer("");
        setQuestionNumber((prev) => prev + 1);
      }
    } catch {
      alert("Error submitting answer");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseInterview = async () => {
    if (!sessionId) return;
    if (!window.confirm("Are you sure you want to close the interview? you will be redirected to the evaluation page.")) return;

    try {
      setLoading(true);
      // 1. Stop Speech
      window.speechSynthesis.cancel();
      // 2. Stop Recording
      isSupposedToBeRecordingRef.current = false;
      cleanupRecording();

      // 3. Call API
      await closeInterview(sessionId);

      // 4. Navigate
      navigate("/thank-you");
    } catch (err) {
      console.error("Failed to close interview", err);
      alert("Error closing interview");
    } finally {
      setLoading(false);
    }
  };

  const integrityColor =
    integrityScore > 70
      ? "text-green-500"
      : integrityScore > 40
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-gradient">
          InterviewAI
        </h1>
        <div className="flex items-center gap-4">
          <Shield className="w-4 h-4" />
          <span className={`font-semibold ${integrityColor}`}>
            {integrityScore}%
          </span>
          <span className="text-sm text-red-500 ml-4">
            Violations: {violationCount}
          </span>
          <button
            onClick={handleCloseInterview}
            className="ml-4 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
          >
            Close Interview
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* AI Avatar Section */}
          <AIAvatarVideo
            isSpeaking={isAISpeaking}
            isUserSpeaking={isRecording}
            analyser={analyserRef.current}
          />

          {/* User Video Section */}
          <div className="glass-card overflow-hidden relative aspect-video lg:aspect-square">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full"
            />
            <div className="absolute top-3 left-3 bg-black/50 px-3 py-1 rounded-full text-xs text-white">
              {!isFaceDetectionEnabled
                ? "Proctoring OFF"
                : !faceLandmarkerRef.current || !objectDetectorRef.current
                  ? "Initializing AI Models..."
                  : faceStatus === "ok"
                    ? "Monitoring Active"
                    : faceStatus === "none"
                      ? "Warning: Face Hidden"
                      : faceStatus === "looking_away"
                        ? "Warning: Looking Away"
                        : faceStatus === "phone_detected"
                          ? "CRITICAL: Phone Detected"
                          : "Warning: Multiple People"}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="glass-card border-primary/20 glow-blue overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Question
                </CardTitle>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold px-3">
                #{questionNumber}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium leading-relaxed text-foreground">
                {question}
              </p>
            </CardContent>
          </Card>

          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Your Response
              </Label>
              {isRecording && (
                <Badge variant="outline" className="animate-pulse bg-red-500/10 text-red-500 border-red-500/20">
                  Listening...
                </Badge>
              )}
            </div>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onPaste={() => handleCheat("Paste attempt detected")}
              placeholder="Type your answer or speak..."
              className="flex-1 min-h-[200px] text-lg bg-white/5 border-white/10 backdrop-blur-md focus-visible:ring-primary/50 focus-visible:border-primary/50 text-foreground resize-none transition-all duration-200"
            />
          </div>

          {/* ALERT POPUP */}
          {alertMessage && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white">
                <Shield className="w-5 h-5" strokeWidth={3} />
                <span className="font-bold uppercase tracking-wider text-sm">{alertMessage}</span>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => {
                if (!isRecording) startAutoRecording();
                else {
                  isSupposedToBeRecordingRef.current = false;
                  cleanupRecording();
                }
              }}
              className="px-4 py-3 rounded-xl border flex items-center gap-2"
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 text-red-500" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Auto Record
                </>
              )}
            </button>

            <button
              onClick={() => speakQuestion(question)}
              className="px-4 py-3 border rounded-xl"
            >
              🔊 Replay
            </button>

            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || loading}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold"
            >
              <Send className="inline w-4 h-4 mr-2" />
              {loading ? "Submitting..." : "Submit & Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;

