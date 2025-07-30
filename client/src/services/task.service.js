// ~/services/task.service.js
import api from "~/utils/axios.js";

// 📋 Get all visible tasks (không bao gồm completed ẩn)
export const getAllTasks = () => api.get("/tasks/visible");

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

// 🆕 Create task
export const createTask = async (data) => {
  try {
    const res = await api.post("/tasks", data);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// 🔧 Handle API error chuẩn
const handleApiError = (error) => {
  if (error.response) return error.response.data;
  return { status: 500, message: "server-is-busy" };
};