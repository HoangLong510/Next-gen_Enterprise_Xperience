// ~/services/task-evidence.service.js
import api from "~/utils/axios.js";

/* =========================
   EVIDENCE: list
   ========================= */
export async function listEvidence(taskId) {
  const res = await api.get(`/tasks/${taskId}/evidence`);
  return Array.isArray(res?.data?.data) ? res.data.data : [];
}

/* =========================
   EVIDENCE: upload (multiple)
   field name required by BE: "files"
   ========================= */
export async function uploadEvidence(taskId, files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(`/tasks/${taskId}/evidence`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // { status, message, data? }
}

/* =========================
   EVIDENCE: delete single
   ========================= */
export async function deleteEvidence(evidenceId) {
  const res = await api.delete(`/tasks/evidence/${evidenceId}`);
  return res.data; // { status, message }
}

/* =========================
   EVIDENCE: clear all (task)
   ========================= */
export async function clearAllEvidence(taskId) {
  const res = await api.delete(`/tasks/${taskId}/evidence`);
  return res.data; // { status, message }
}
