// ~/services/task.service.js
import api from "~/utils/axios.js";

// 📋 Get all visible tasks (không bao gồm completed ẩn)
export const getAllTasks = () => api.get("/tasks/visible");
export const updateTask = async (taskId, data) => {
  const res = await api.put(`/tasks/${taskId}`, data);
  return res.data; // { status, message, data: TaskDto }
};
export const createBranchForTask = async (taskId, { branchName, accessToken } = {}) => {
  try {
    const res = await api.post(`/tasks/${taskId}/branch`, { branchName, accessToken });
    return res.data; // { status, message }
  } catch (error) {
    // Có thể gặp: "please-login-github-to-continue", "unauthorized", "Failed to create branch"
    return handleApiError(error);
  }
};
// 🔍 Search tasks theo từ khoá (tên hoặc mô tả)
export const searchTasks = (keyword) =>
  api.get("/tasks/search", { params: { keyword } });

// 🧩 Filter theo status — xử lý "ALL" ngay tại FE
export const filterTasks = async (status) => {
  const params = {};
  if (status && status !== "ALL") params.status = status;

  const res = await api.get("/tasks/filter", { params });
  return res.data.data; // ✅ chỉ trả về mảng task
};

// ➡️ Lấy task cho Kanban Board của user hiện tại theo projectId
export const getKanbanTasks = async (projectId) => {
  const res = await api.get("/tasks/kanban", { params: { projectId } });
  return res.data.data;   // <-- trả về luôn mảng tasks
};
// 🆕 Create task
export const createTask = async (data) => {
  try {
    const res = await api.post("/tasks", data);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};
export const getTaskStatuses = () =>
  api.get("/tasks/statuses").then(res => res.data.data || []);
export const updateTaskStatus = (taskId, newStatus) =>
  api
    .put(`/tasks/${taskId}/status`, { status: newStatus })
    .then(res => res.data);
export const getTaskSizes = async () => {
  const res = await api.get("/tasks/sizes");
  return res?.data?.data || ["S", "M", "L"]; // fallback nếu BE đổi message format
};
// ➡️ Cập nhật thứ tự task trong cột Kanban
export const updateKanbanOrder = (orderedTaskIds) =>
  api
    .put("/tasks/kanban/order", orderedTaskIds)
    .then(res => res.data);
// 🔧 Handle API error chuẩn
const handleApiError = (error) => {
  if (error.response) return error.response.data;
  return { status: 500, message: "server-is-busy" };
};
