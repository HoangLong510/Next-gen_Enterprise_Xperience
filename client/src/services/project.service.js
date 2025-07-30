// ~/services/project.service.js
import api from "~/utils/axios.js";

// 📋 Get all visible projects (không bao gồm completed ẩn)
export const getAllProjects = () => api.get("/projects");

// ✅ Get all completed projects
export const getDoneProjects = () => api.get("/projects/done");

// 🔍 Search projects theo từ khoá (tên hoặc mã tài liệu)
export const searchProjects = (keyword) =>
  api.get("/projects/search", { params: { keyword } });

// 🧩 Filter theo status & priority — xử lý "ALL" ngay tại FE
export const filterProjects = async (status, priority) => {
  const params = {};
  if (status && status !== "ALL") params.status = status;
  if (priority && priority !== "ALL") params.priority = priority;

  const res = await api.get("/projects/filter", { params });
  return res.data.data; // ✅ chỉ trả về mảng project
};

// 🆕 Create project

export const createProjectFromDocument = async (data) => {
  try {
    const res = await api.post("/projects", data);
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return { status: 500, message: "server-is-busy" };
  }
};
// ✏️ Update project
export const updateProject = async (id, dto) => {
  try {
    const res = await api.put(`/projects/${id}`, dto);
    return res.data.data; // ✅ trả về dữ liệu đúng
  } catch (error) {
    console.error("❌ Lỗi API:", error);
    return { status: 500, message: "server-error" }; // ✅ ít nhất trả về object
  }
};
// 📄 Get project detail by ID
export const getProjectDetail = async (id) => {
  try {
    const res = await api.get(`/projects/${id}`);
    return res.data; // ✅ trả về object chứa thông tin project
  } catch (error) {
    return handleApiError(error);
  }
};
// ❌ Cancel project
export const deleteProject = async (id) => {
  try {
    const res = await api.delete(`/projects/${id}`);
    return res.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// 🔗 Link GitHub repo
export const linkRepoToProject = async (id, dto) => {
  try {
    const res = await api.post(`/projects/${id}/repo`, dto);
    return res.data.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// 🔧 Handle API error chuẩn
const handleApiError = (error) => {
  if (error.response) return error.response.data;
  return { status: 500, message: "server-is-busy" };
};