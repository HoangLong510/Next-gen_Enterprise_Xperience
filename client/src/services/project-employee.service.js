// ~/services/project-employee.service.js
import api from "~/utils/axios.js";

// 🔍 Search available employees by name & role
export const searchAvailableByNameAndRole = (projectId, keyword) =>
 api.get(`/projects/${projectId}/employees/available/search`, { params: { keyword } });

// 📋 Get available employees (optionally filtered by keyword & department)
export const getAvailableEmployees = (projectId, keyword, departmentId) =>
  api.get(`/projects/${projectId}/employees/available`, {
    params: { keyword, departmentId },
  });

// 🧩 Filter available employees
export const filterAvailableEmployees = (projectId, keyword, departmentId) =>
  api.get(`/projects/${projectId}/employees/available/filter`, {
    params: { keyword, departmentId },
  });

// ✅ Get employees assigned to project
export const getProjectEmployees = (projectId) =>
  api.get(`/projects/${projectId}/employees`);

// ➕ Add employees to project
export const addEmployeesToProject = async (projectId, requestDto) => {
  try {
    const res = await api.post(`/projects/${projectId}/employees`, requestDto);
    return res.data; // giữ message
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};


// ❌ Remove employees from project
export const removeEmployeesFromProject = async (projectId, requestDto) => {
  try {
    const res = await api.delete(`/projects/${projectId}/employees`, {
      data: requestDto,
    });
    return res.data; // giữ message
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};
