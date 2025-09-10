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
// Giữ nguyên endpoint simple-list, nhưng merge role từ accounts/employees-lite nếu có
export const fetchEmployeeListApi = async () => {
  try {
    const [simpleRes, liteRes] = await Promise.all([
      api.get("/employees/simple-list", {
        headers: { "Content-Type": "application/json" },
      }),
      api.get("/accounts/employees-lite", {
        headers: { "Content-Type": "application/json" },
      }).catch(() => ({ data: { status: 200, data: [] } })),
    ]);

    const simpleRaw = simpleRes?.data?.data ?? simpleRes?.data ?? [];
    const simple = Array.isArray(simpleRaw) ? simpleRaw : [];

    const liteRaw = liteRes?.data?.data ?? liteRes?.data ?? [];
    const lite = Array.isArray(liteRaw) ? liteRaw : [];

    const roleById = new Map(
      lite
        .filter((x) => x && (x.id ?? x.employeeId) != null)
        .map((x) => [Number(x.id ?? x.employeeId), x.role || x.employeeRole || null])
    );

    const normalized = simple.map((e) => {
      const id = Number(e.id);
      const fullName =
        e.fullName ||
        e.name ||
        [e.firstName, e.lastName].filter(Boolean).join(" ").trim();

      const role =
        e.role ||
        e.employeeRole ||
        e.accountRole ||
        e?.account?.role ||
        (Array.isArray(e?.roles) ? e.roles[0] : null) ||
        roleById.get(id) ||
        null;

      return { ...e, id, fullName, role };
    });

    return { status: 200, data: normalized };
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
    return res;
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
