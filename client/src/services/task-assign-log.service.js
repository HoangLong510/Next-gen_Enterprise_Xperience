import api from "~/utils/axios.js";

// Lấy danh sách assignment logs theo taskId
export const getAssignmentLogsByTask = async (taskId) => {
  const res = await api.get(`/tasks/${taskId}/assignment-logs`);
  return res.data; // { status, message, data: [...] }
};
