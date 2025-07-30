import api from "~/utils/axios.js";

/**
 * Tạo quỹ
 */
export const createFundApi = async (data) => {
  try {
    const res = await api.post("/accountant/funds", data);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Cập nhật quỹ
 */
export const updateFundApi = async (id, data) => {
  try {
    const res = await api.put(`/accountant/funds/${id}`, data);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Cập nhật trạng thái quỹ
 */
export const updateFundStatusApi = async (id, data) => {
  try {
    const res = await api.patch(`/accountant/funds/${id}/status`, data);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Lấy danh sách quỹ (filter optional)
 */
export const getFundsApi = async (params) => {
  try {
    const res = await api.get("/accountant/funds", { params });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Lấy dữ liệu tổng quan quỹ
 */
export const getFundSummaryApi = async () => {
  try {
    const res = await api.get(`/accountant/funds/summary`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Lấy chi tiết quỹ
 */
export const getFundByIdApi = async (id) => {
  try {
    const res = await api.get(`/accountant/funds/${id}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Khóa quỹ
 */
export const lockFundApi = async (id, reason, file) => {
  const formData = new FormData();
  formData.append("reason", reason);
  if (file) formData.append("file", file);
  try {
    const res = await api.patch(`/accountant/funds/${id}/lock`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Mở khóa quỹ
 */
export const unlockFundApi = async (id, reason, file) => {
  const formData = new FormData();
  formData.append("reason", reason);
  if (file) formData.append("file", file);
  try {
    const res = await api.patch(`/accountant/funds/${id}/unlock`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Tạo giao dịch
 */
export const createTransactionApi = async (fundId, formData) => {
  try {
    const res = await api.post(`/accountant/funds/${fundId}/transactions`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Lấy danh sách giao dịch
 */
export const getTransactionsApi = async (fundId) => {
  try {
    const res = await api.get(`/accountant/funds/${fundId}/transactions`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

/**
 * Duyệt giao dịch
 */
export const approveTransactionApi = async (fundId, transactionId, approve, comment) => {
  const formData = new FormData();
  formData.append("approve", approve);
  if (comment) formData.append("comment", comment);
  try {
    const res = await api.patch(`/accountant/funds/${fundId}/transactions/${transactionId}/approval`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};



/**
 * Lấy tất cả transactions, có filter
 */
export const getAllTransactionsApi = async (params = {}) => {
  try {
    const res = await api.get("/accountant/funds/transactions", {
      params
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};




