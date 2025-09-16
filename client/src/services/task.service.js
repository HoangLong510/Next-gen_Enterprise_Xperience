// ~/services/task.service.js
import api from "~/utils/axios.js";

/* =========================
   TASKS: reads & queries
   ========================= */
// Visible tasks (exclude hidden completed)
export const getAllTasks = () => api.get("/tasks/visible");

// Search by keyword (name/description)
export const searchTasks = (keyword) =>
  api.get("/tasks/search", { params: { keyword } });

// Filter by status (handle "ALL" on FE)
export const filterTasks = async (status) => {
  const params = {};
  if (status && status !== "ALL") params.status = status;
  const res = await api.get("/tasks/filter", { params });
  return res.data.data; // array
};

// Kanban tasks for current user (optional projectId)
export const getKanbanTasks = async (projectId) => {
  const res = await api.get("/tasks/kanban", { params: { projectId } });
  return res.data.data; // array
};

/* =========================
   TASKS: create & update
   ========================= */
export const createTask = async (data) => {
  try {
    const res = await api.post("/tasks", data);
    return res.data; // { status, message, data }
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateTask = async (taskId, data) => {
  const res = await api.put(`/tasks/${taskId}`, data);
  return res.data; // { status, message, data }
};

// Update only status
export const updateTaskStatus = (taskId, newStatus) =>
  api.put(`/tasks/${taskId}/status`, { status: newStatus }).then((res) => res.data);

// Update ordering inside a Kanban column (array of taskIds)
export const updateKanbanOrder = (orderedTaskIds) =>
  api.put("/tasks/kanban/order", orderedTaskIds).then((res) => res.data);

/* =========================
   TASKS: metadata
   ========================= */
export const getTaskStatuses = () =>
  api.get("/tasks/statuses").then((res) => res.data.data || []);

export const getTaskSizes = async () => {
  const res = await api.get("/tasks/sizes");
  return res?.data?.data || ["S", "M", "L"]; // fallback
};

/* =========================
   GITHUB: branch helpers
   ========================= */
export const createBranchForTask = async (taskId, { branchName, accessToken } = {}) => {
  try {
    const res = await api.post(`/tasks/${taskId}/branch`, { branchName, accessToken });
    return res.data; // { status, message }
  } catch (error) {
    // e.g. "please-login-github-to-continue", "unauthorized", "Failed to create branch"
    return handleApiError(error);
  }
};

/* =========================
   ERROR
   ========================= */
const handleApiError = (error) => {
  if (error.response) return error.response.data;
  return { status: 500, message: "server-is-busy" };
};
