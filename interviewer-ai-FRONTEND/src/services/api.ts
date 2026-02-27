const API_BASE = "http://localhost:8000/api";

export async function startInterview(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/start-interview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to start interview");

  return res.json();
}

export async function submitAnswer(sessionId: string, answer: string) {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("answer", answer);

  const res = await fetch(`${API_BASE}/submit-answer`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to submit answer");

  return res.json();
}

export async function getFinalReport(sessionId: string) {
  const formData = new FormData();
  formData.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/final-report`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to get final report");

  return res.json();
}

export async function transcribeAudio(file: Blob) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/stt`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("STT failed");

  return res.json();
}
export const reportCheat = async (
  sessionId: string,
  event: string
) => {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("event", event);

  const response = await fetch(
    "http://localhost:8000/api/report-cheat",
    {
      method: "POST",
      body: formData,
    }
  );

  return response.json();
};

export async function visionCheck(sessionId: string, blob: Blob) {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("file", blob, "frame.jpg");

  const res = await fetch(`${API_BASE}/vision-check`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Vision check failed");

  return res.json();
}



