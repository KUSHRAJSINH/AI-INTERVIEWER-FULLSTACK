const API_BASE = "http://localhost:8000/api";

export async function startInterview(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("token", token);

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

export async function closeInterview(sessionId: string) {
  const formData = new FormData();
  formData.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/close-interview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to close interview");

  return res.json();
}

export async function getAdminInterviews() {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API_BASE}/admin/interviews`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to fetch interviews");
  }
  return res.json();
}

export async function createAdminInterview(email: string) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API_BASE}/admin/create-interview?email=${encodeURIComponent(email)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    throw new Error("Failed to create interview");
  }
  return res.json();
}

export async function adminLogin(formData: FormData) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Invalid username or password");
  return res.json();
}

export async function deleteAdminInterview(inviteId: number) {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API_BASE}/admin/interviews/${inviteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    if (res.status === 404) throw new Error("Not found");
    throw new Error("Failed to delete interview");
  }
  return res.json();
}



