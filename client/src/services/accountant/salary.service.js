import api from "~/utils/axios";

// Employee basic info
export const getEmployeeBasicInfoApi = async (input) => {
  try {
    const res = await api.get("/accountant/salaries/employee", {
      params: { input },
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Departments
export const getAllDepartmentsApi = async () => {
  try {
    const res = await api.get("/accountant/salaries/departments");
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Roles
export const getAllRolesApi = async () => {
  try {
    const res = await api.get("/accountant/salaries/roles");
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Salary by ID
export const getSalaryByIdApi = async (id) => {
  try {
    const res = await api.get(`/accountant/salaries/${id}`);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Salary history by employee code
export const getSalaryHistoryByEmployeeApi = async (employeeCode) => {
  try {
    const res = await api.get(
      `/accountant/salaries/history/${employeeCode}`
    );
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// All salaries with filters
export const getAllSalariesWithFiltersApi = async ({
  department,
  position,
  name,
}) => {
  try {
    const params = {};
    if (department) params.department = department;
    if (position) params.position = position;
    if (name) params.name = name;

    const res = await api.get("/accountant/salaries", { params });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Salary summary
export const getSalarySummaryApi = async ({
  department,
  position,
  code,
  role,
}) => {
  try {
    const params = {};
    if (department) params.department = department;
    if (position) params.position = position;
    if (code) params.code = code;
    if (role) params.role = role;

    const res = await api.get("/accountant/salaries/summary", { params });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Generate monthly salaries
export const generateMonthlySalaryApi = async ({ year, month }) => {
  try {
    const res = await api.post("/accountant/salaries/generate", null, {
      params: { year, month },
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Update salary (inline editing)
export const updateSalaryApi = async (id, payload) => {
  try {
    const res = await api.put(`/accountant/salaries/${id}`, payload);
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

/* ========== ALL ACTIONS (new) ========== */

// Submit all salaries (Accountant)
export const submitAllSalariesApi = async (year, month) => {
  try {
    const res = await api.post("/accountant/salaries/submit-all", null, {
      params: { year, month },
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Review all (Chief Accountant)
export const reviewAllSalariesApi = async (year, month) => {
  try {
    const res = await api.post("/accountant/salaries/review-all", null, {
      params: { year, month },
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Approve all final (Director)
export const approveAllFinalSalariesApi = async (year, month) => {
  try {
    const res = await api.post(
      "/accountant/salaries/approve-all-final",
      null,
      { params: { year, month } }
    );
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};

// Send all salary slips (emails)
export const sendAllSalaryEmailsApi = async (year, month) => {
  try {
    const res = await api.post("/accountant/salaries/send-all", null, {
      params: { year, month },
    });
    return res.data;
  } catch (error) {
    return (
      error.response?.data || { status: 500, message: "server-is-busy" }
    );
  }
};
