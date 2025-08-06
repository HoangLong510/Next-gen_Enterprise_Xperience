import api from "~/utils/axios";

export const getEmployeeBasicInfoApi = async (input) => {
  try {
    const res = await api.get("/accountant/salaries/employee", {
      params: { input },
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

export const getAllDepartmentsApi = async () => {
  try {
    const res = await api.get("/accountant/salaries/departments");
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

// Từ:
export const createSalaryApi = async (input, baseSalary) => {
  try {
    const res = await api.post("/accountant/salaries/create", null, {
      params: { input, baseSalary },
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

export const getSalaryHistoryByEmployeeApi = async (employeeCode) => {
  try {
    const res = await api.get(`/accountant/salaries/history/${employeeCode}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

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
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

export const getSalarySummaryApi = async ({ department, position, name }) => {
  try {
    const params = {};
    if (department) params.department = department;
    if (position) params.position = position;
    if (name) params.name = name;

    const res = await api.get("/accountant/salaries/summary", { params });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

export const downloadSalaryTemplateApi = async () => {
  try {
    const res = await api.get("/accountant/salaries/template/download", {
      responseType: "blob",
    });
    return res;
  } catch (error) {
    return error.response || { status: 500, message: "server-is-busy" };
  }
};

export const importSalaryFromExcelApi = async (formData) => {
  try {
    const res = await api.post("/accountant/salaries/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: "json", 
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};
export const generateMonthlySalaryApi = async ({ year, month }) => {
  try {
    const res = await api.post("/accountant/salaries/generate", null, {
      params: { year, month },
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};
import axios from "~/utils/axios"; 

export const getSalaryByIdApi = (id) => {
  return axios.get(`/accountant/salaries/${id}`);
};
