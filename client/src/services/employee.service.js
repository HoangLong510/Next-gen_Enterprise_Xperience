import api from "~/utils/axios.js";

export const changeAvatarApi = async (form) => {
  try {
    const res = await api.post("/employees/change-avatar", form, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return {
      status: 500,
      message: "server-is-busy"
    };
  }
};

export const getListHodApi = async () => {
  try {
    const res = await api.get("/employees/get-list-hod", {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return {
      status: 500,
      message: "server-is-busy"
    };
  }
};

export const getEmployeesToAddToDepartmentApi = async (data) => {
  try {
    const res = await api.post(
      "/employees/get-employees-to-add-to-department",
      data,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return {
      status: 500,
      message: "server-is-busy"
    };
  }
};

// Lấy danh sách nhân viên (dùng chung cho nhiều chức năng)
export const fetchEmployeeListApi = async () => {
  try {
    const res = await api.get("/employees/simple-list", {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, data: [] };
  }
};

// Tạo mới nhân viên
export const createEmployeeApi = async (data) => {
  try {
    const res = await api.post("/employees/create", data, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return {
      status: 500,
      message: "server-is-busy"
    };
  }
};

// Chỉnh sửa nhân viên
export const editEmployeeApi = async (data) => {
  try {
    const res = await api.post("/employees/edit", data, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return {
      status: 500,
      message: "server-is-busy"
    };
  }
};

// Lấy chi tiết nhân viên theo accountId
export const getEmployeeDetailsByAccountIdApi = async (id) => {
  try {
    const res = await api.get(
      `/employees/get-employee-details-by-account-id/${id}`,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return {
      status: 500,
      message: "server-is-busy"
    };
  }
};

// Download template import nhân viên
export const downloadEmployeesImportTemplateApi = async () => {
  try {
    const res = await api.get("/employees/import/template", {
      responseType: "blob"
    });
    return res; // trả full response để lấy headers nếu cần
  } catch (error) {
    throw error;
  }
};

// Preview file import nhân viên
export const previewEmployeesImportApi = async (fileOrBlob) => {
  const form = new FormData();
  form.append("file", fileOrBlob, "employees.xlsx");
  try {
    const res = await api.post("/employees/import/preview", form, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Import thật nhân viên
export const importEmployeesApi = async (fileOrBlob) => {
  const form = new FormData();
  form.append("file", fileOrBlob, "employees.xlsx");
  try {
    const res = await api.post("/employees/import/", form, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};
