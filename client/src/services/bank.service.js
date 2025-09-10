import api from "~/utils/axios";



// Nạp tiền
export const createTopupApi = async (data = {}) => {
  try {
    const res = await api.post("/payments/topups/bulk", data, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

// Lịch sử topup của chính user
export const getMyTopupsApi = async ({ page = 1, size = 20, scope } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("size", size);
    if (scope) params.set("scope", scope); 
    const res = await api.get(`/payments/topups?${params.toString()}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

// Kiểm tra trạng thái nạp theo code
export const getTopupStatusApi = async (code) => {
  try {
    const safe = encodeURIComponent(code);
    const res = await api.get(`/payments/topups/status/${safe}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

// Lấy QR cho topup 
export const getTopupQrImageApi = async (code) => {
  try {
    const safe = encodeURIComponent(code);
    const res = await api.get(`/payments/topups/${safe}/qr`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};


// Helper format ngày YYYY-MM-DD theo BE
const fmtDate = (d) => {
  if (!d) return undefined;
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return String(d);
};

// Snapshot số dư hiện tại
export const getBankSnapshotApi = async () => {
  try {
    const res = await api.get("/accountant/bank/snapshot");
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

// Lịch sử giao dịch 
export const getBankTransactionsPageApi = async (filter = {}) => {
  try {
    const {
      from,        
      to,          
      page = 1,    
      size = 20,
    } = filter;

    const params = new URLSearchParams();
    const fromDate = fmtDate(from);
    const toDate = fmtDate(to);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate)   params.set("toDate", toDate);
    params.set("page", page);
    params.set("size", size);

    const res = await api.get(`/accountant/bank/history?${params.toString()}`);
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};

// Đồng bộ lại số dư Fund 
export const refreshBankApi = async () => {
  try {
    const res = await api.post("/accountant/bank/refresh");
    return res.data;
  } catch (error) {
    return error.response?.data || { status: 500, message: "server-is-busy" };
  }
};
