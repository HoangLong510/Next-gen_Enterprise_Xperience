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
