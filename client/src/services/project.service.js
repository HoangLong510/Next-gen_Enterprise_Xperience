// ~/services/project.service.js
import api from "~/utils/axios.js";

/* =========================
   PROJECTS: list (visible)
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const getAllProjects = () => api.get("/projects");

/* =========================
   PROJECTS: list (completed)
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const getDoneProjects = () => api.get("/projects/done");

/* =========================
   PROJECTS: search by keyword
   returns: Project[]
   ========================= */
export const searchProjects = async (keyword) => {
  try {
    const res = await api.get("/projects/search", { params: { keyword } });
    return res.data.data; // unwrap to array
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/* =========================
   PROJECTS: filter by status
   returns: Project[]
   ========================= */
export const filterProjects = async (status) => {
  const params = {};
  if (status && status !== "ALL") params.status = status;

  const res = await api.get("/projects/filter", { params });
  return res.data.data; // unwrap to array
};

/* =========================
   PROJECTS: repo info
   returns: { status, message, data: { repoLink, owner, name, defaultBranch } }
   ========================= */
export const getProjectRepo = async (id) => {
  try {
    const res = await api.get(`/projects/${id}/repo`);
    return res.data;
  } catch (error) {
    // e.g. 204 "no-repo-linked", 401 "please-login-github-to-continue"
    return handleApiError(error);
  }
};

/* =========================
   KANBAN: projects for staff board
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const getKanbanProjects = () => api.get("/projects/kanban");

/* =========================
   PROJECTS: create
   returns: { status, message, data? }
   ========================= */
export const createProjectFromDocument = async (data) => {
  try {
    const res = await api.post("/projects", data);
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/* =========================
   PROJECTS: update
   returns: { status, message, data? }
   ========================= */
export const updateProject = async (id, dto) => {
  try {
    const res = await api.put(`/projects/${id}`, dto, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    console.error("API error:", error);
    return { status: 500, message: "server-error" };
  }
};

/* =========================
   PROJECTS: detail
   returns: { status, data }
   ========================= */
export const getProjectDetail = async (id) => {
  try {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/* =========================
   PROJECTS: delete/cancel
   returns: { status, message }
   ========================= */
export const deleteProject = async (id) => {
  try {
    const res = await api.delete(`/projects/${id}`);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/* =========================
   PROJECTS: link GitHub repo
   body: { repoUrl }
   returns: { status, message }
   ========================= */
export const linkRepoToProject = async (id, dto) => {
  try {
    const res = await api.post(`/projects/${id}/repo`, dto);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/* =========================
   Shared: API error handler
   ========================= */
const handleApiError = (error) => {
  if (error.response) return error.response.data;
  return { status: 500, message: "server-is-busy" };
};
<<<<<<< Updated upstream

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
=======
>>>>>>> Stashed changes
