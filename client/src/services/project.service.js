// ~/services/project.service.js
import api from "~/utils/axios.js";

// 📋 Get all visible projects (không bao gồm completed ẩn)
export const getAllProjects = () => api.get("/projects");

// ✅ Get all completed projects
export const getDoneProjects = () => api.get("/projects/done");

// 🔍 Search projects theo từ khoá (tên hoặc mã tài liệu)
export const searchProjects = async (keyword) => {
  try {
    const res = await api.get("/projects/search", { params: { keyword } });
    return res.data.data;     // ← unwrap thành mảng project
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// 🧩 Filter theo status — bỏ phần priority vì backend không xử lý nữa
export const filterProjects = async (status) => {
  const params = {};
  if (status && status !== "ALL") params.status = status;

  const res = await api.get("/projects/filter", { params });
  return res.data.data; // ✅ chỉ trả về mảng project
};

// ➡️ Lấy danh sách Project cho Kanban Board (Employee)
export const getKanbanProjects = () => api.get("/projects/kanban");

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
    const res = await api.put(`/projects/${id}`, dto, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    console.error("❌ Lỗi API:", error);
    return { status: 500, message: "server-error" };
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
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// 🔗 Link GitHub repo
export const linkRepoToProject = async (id, dto) => {
  try {
    const res = await api.post(`/projects/${id}/repo`, dto);
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
export const createQuickTask = async (projectId, name) => {
  try {
    const payload = name ? { name } : {}; 
    const res = await api.post(`/projects/${projectId}/quick-task`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;  
  } catch (error) {
    return handleApiError(error);
  }
};

export const createQuickTasksBulk = async (projectId, data, isFormData = false) => {
  try {
    const headers = isFormData
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };

    const res = await api.post(`/projects/${projectId}/quick-tasks`, data, {
      headers,
    });
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getDepartmentsApi = async () => {
  try {
    const res = await api.get("/projects/quick-tasks/departments");
    return res.data; 
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

export const searchEmployeesApi = async (q = "", opts = {}) => {
  try {
    const params = { q };

    if (opts.limit != null) params.limit = opts.limit;
    if (opts.departmentId != null) params.departmentId = opts.departmentId;

    const res = await api.get("/projects/quick-tasks/employees/search", {
      params,
    });

    return res.data;
  } catch (error) {
    return (
      error.response?.data || {
        status: 500,
        message: "server-is-busy",
      }
    );
  }
};

export const uploadPublicImageApi = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/projects/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data; 
  } catch (err) {
    if (err.response) return err.response.data;  
    return { status: 500, message: "server-is-busy" };
  }
};

