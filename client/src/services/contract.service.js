import api from "~/utils/axios";

// Lấy danh sách hợp đồng
export const fetchContractListApi = async (params = {}) => {
  try {
    const res = await api.get("/contracts", { params, headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Lấy chi tiết hợp đồng theo id
export const fetchContractDetailApi = async (id) => {
  try {
    const res = await api.get(`/contracts/${id}`, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Tạo mới hợp đồng
export const createContractApi = async (form) => {
  try {
    const res = await api.post("/contracts", form, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Cập nhật hợp đồng
export const updateContractApi = async (id, form) => {
  try {
    const res = await api.put(`/contracts/${id}`, form, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Xóa hợp đồng
export const deleteContractApi = async (id) => {
  try {
    const res = await api.delete(`/contracts/${id}`, { headers: { "Content-Type": "application/json" } });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/**
 * Ký hợp đồng: MANAGER / EMPLOYEE
 * BE: POST /contracts/sign/{contractId}?signerRole=MANAGER|EMPLOYEE
 * Body optional: { signature: "<base64 data URL>" }
 * - Nếu không truyền signature -> BE dùng SignatureSample đã lưu của user.
 */
export const signContractApi = async ({ contractId, signerRole, signature }) => {
  try {
    const body = signature ? { signature } : {};
    const res = await api.post(
      `/contracts/sign/${contractId}`,
      body,
      { params: { signerRole: (signerRole || "").toUpperCase() },
        headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};


// (Tuỳ chọn) Trigger expire HĐ hết hạn hôm nay — dùng cho admin/test
export const expireTodayApi = async () => {
  try {
    const res = await api.post("/contracts/expire-today", null, { headers: { "Content-Type": "application/json" } });
    return res.data; // { status: 200, data: <affectedCount>, ... }
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/**
 * Chữ ký mẫu dùng chung với LeaveRequest
 * GET  /leave-requests/my-signature-sample  -> trả về base64 hoặc null
 * POST /leave-requests/my-signature-sample  -> body là raw string base64
 */
export const getMySignatureSampleApi = async () => {
  try {
    const res = await api.get("/leave-requests/my-signature-sample", {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

export const saveMySignatureSampleApi = async (signatureBase64) => {
  try {
    const res = await api.post(
      "/leave-requests/my-signature-sample",
      { signature: signatureBase64 },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Xuất file Word hợp đồng (tải về)
export const exportContractWordApi = async (id) => {
  try {
    const res = await api.get(`/contracts/${id}/export-word`, {
      responseType: "blob",
    });
    // trả kèm headers để đọc Content-Disposition -> tên file
    return { status: 200, data: res.data, headers: res.headers };
  } catch (error) {
    if (error.response) {
      // khi BE trả lỗi (404/500) axios vẫn có response
      return { status: error.response.status, message: "export-failed" };
    }
    return { status: 500, message: "server-is-busy" };
  }
};

export const downloadBlob = (blob, filename = "download.docx") => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
