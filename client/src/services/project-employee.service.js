// ~/services/project-employee.service.js
import api from "~/utils/axios.js";

/* =========================
   AVAILABLE: search by name/role
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const searchAvailableByNameAndRole = (projectId, keyword) =>
  api.get(`/projects/${projectId}/employees/available/search`, { params: { keyword } });

/* =========================
   AVAILABLE: list (optional filters)
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const getAvailableEmployees = (projectId, keyword, departmentId) =>
  api.get(`/projects/${projectId}/employees/available`, {
    params: { keyword, departmentId },
  });

/* =========================
   AVAILABLE: filter endpoint
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const filterAvailableEmployees = (projectId, keyword, departmentId) =>
  api.get(`/projects/${projectId}/employees/available/filter`, {
    params: { keyword, departmentId },
  });

/* =========================
   PROJECT MEMBERS: list assigned
   NOTE: returns Axios Promise (caller unwraps)
   ========================= */
export const getProjectEmployees = (projectId) =>
  api.get(`/projects/${projectId}/employees`);

/* =========================
   PROJECT MEMBERS: add
   returns: { status, message, data? }
   ========================= */
export const addEmployeesToProject = async (projectId, requestDto) => {
  try {
    const res = await api.post(`/projects/${projectId}/employees`, requestDto);
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/* =========================
   PROJECT MEMBERS: remove
   body: { employeeIds: number[] }
   returns: { status, message }
   ========================= */
export const removeEmployeesFromProject = async (projectId, requestDto) => {
  try {
    const res = await api.delete(`/projects/${projectId}/employees`, {
    data: requestDto,
  });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};
