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
      // gọi kèm để lấy role; nếu BE chưa có endpoint này thì cho phép fail mà không vỡ hàm
      api.get("/accounts/employees-lite", {
        headers: { "Content-Type": "application/json" },
      }).catch(() => ({ data: { status: 200, data: [] } })),
    ]);

    // mảng từ simple-list (tuỳ BE có thể là {status,data} hoặc array)
    const simpleRaw = simpleRes?.data?.data ?? simpleRes?.data ?? [];
    const simple = Array.isArray(simpleRaw) ? simpleRaw : [];

    // mảng lite có { id, fullName, role }
    const liteRaw = liteRes?.data?.data ?? liteRes?.data ?? [];
    const lite = Array.isArray(liteRaw) ? liteRaw : [];

    // map employeeId -> role
    const roleById = new Map(
      lite
        .filter((x) => x && (x.id ?? x.employeeId) != null)
        .map((x) => [Number(x.id ?? x.employeeId), x.role || x.employeeRole || null])
    );

    // chuẩn hoá item và bù role nếu thiếu
    const normalized = simple.map((e) => {
      const id = Number(e.id);
      const fullName =
        e.fullName ||
        e.name ||
        [e.firstName, e.lastName].filter(Boolean).join(" ").trim();

      // ưu tiên những chỗ có sẵn role trong simple-list; nếu không có thì lấy từ lite
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

