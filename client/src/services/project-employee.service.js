// ~/services/project-employee.service.js
import api from "~/utils/axios.js";

// 🔍 Search available employees by name & role
export const searchAvailableByNameAndRole = (projectId, keyword) =>
  api.get(`/projects/${projectId}/employees/available/search`, {
    params: { keyword },
  });

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
export const addEmployeesToProject = (projectId, requestDto) =>
  api.post(`/projects/${projectId}/employees`, requestDto);

// ❌ Remove employees from project
export const removeEmployeesFromProject = (projectId, requestDto) =>
  api.delete(`/projects/${projectId}/employees`, { data: requestDto });