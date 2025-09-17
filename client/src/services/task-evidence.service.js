// ~/services/task-evidence.service.js
import api from "~/utils/axios.js";

// Danh sách evidence của 1 task
export async function listEvidence(taskId) {
  const res = await api.get(`/tasks/${taskId}/evidence`);
  return Array.isArray(res?.data?.data) ? res.data.data : [];
}

// Upload nhiều evidence (images/videos/files)
export async function uploadEvidence(taskId, files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await api.post(`/tasks/${taskId}/evidence`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // {status, message, data?}
}

// Xoá 1 evidence theo id
export async function deleteEvidence(evidenceId) {
  const res = await api.delete(`/tasks/evidence/${evidenceId}`);
  return res.data; // {status, message}
}

// (Không bắt buộc) Xoá toàn bộ evidence của task
export async function clearAllEvidence(taskId) {
  const res = await api.delete(`/tasks/${taskId}/evidence`);
  return res.data; // {status, message}
}
