import api from "~/utils/axios";

// Lấy danh sách đơn nghỉ phép (có filter + phân trang + tìm kiếm)
export const getLeaveRequestsApi = async (params = {}) => {
  try {
    const {
      status, page, size,
      departmentId,   // Long
      departmentName, // String (keyword)
      senderName,     // String (keyword)
      date,           // 'yyyy-MM-dd'
      month           // 'yyyy-MM'
    } = params;

    const query = [];
    if (status)       query.push(`status=${encodeURIComponent(status)}`);
    if (page)         query.push(`page=${page}`);
    if (size)         query.push(`size=${size}`);
    if (departmentId) query.push(`departmentId=${departmentId}`);
    if (departmentName) query.push(`departmentName=${encodeURIComponent(departmentName)}`);
    if (senderName)   query.push(`senderName=${encodeURIComponent(senderName)}`);
    if (date)         query.push(`date=${encodeURIComponent(date)}`);   // yyyy-MM-dd
    if (month)        query.push(`month=${encodeURIComponent(month)}`); // yyyy-MM

    const queryString = query.length ? `?${query.join("&")}` : "";

    const res = await api.get(`/leave-requests${queryString}`, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};


// Tạo đơn nghỉ phép
export const createLeaveRequestApi = async (form) => {
	try {
		const res = await api.post("/leave-requests", form, {
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

// Từ chối đơn nghỉ phép có truyền lý do
export const rejectLeaveRequestApi = async (id, reason) => {
  try {
    const res = await api.post(
      `/leave-requests/${id}/reject`,
      { rejectReason: reason }, // gửi body có lý do
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


// Xuất đơn nghỉ phép ra file Word
export const exportLeaveRequestWordApi = async (id) => {
	try {
		const res = await api.get(`/leave-requests/${id}/export-word`, {
			responseType: "blob",
			headers: {
				"Content-Type": "application/json"
			}
		});
		return res.data;
	} catch (error) {
		throw error;
	}
};

// Duyệt đơn nghỉ phép (thêm signature base64)
export const approveLeaveRequestApi = async (id, signature) => {
  try {
    const res = await api.post(
      `/leave-requests/${id}/approve`,
      { signature }, // gửi signature qua body
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return { status: 500, message: "server-is-busy" };
  }
};

// Lấy danh sách đơn bạn cần duyệt (pending - dành cho HOD/MANAGER/CHIEFACCOUNTANT)
export const getPendingToApproveApi = async () => {
  try {
    const res = await api.get("/leave-requests/pending-to-approve", {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

//danh sách các đơn của bạn mà chưa được duyệt
export const getMyPendingSentApi = async () => {
  try {
    const res = await api.get("/leave-requests/my-pending", {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Lấy chi tiết đơn nghỉ phép theo ID
export const getLeaveRequestDetailApi = async (id) => {
  try {
    const res = await api.get(`/leave-requests/${id}`);
    return res.data;
  } catch (error) {
    return { status: 500, message: "server-is-busy" };
  }
};

/**
 * Lấy danh sách ngày bận (nhiều người nghỉ) trong tháng của 1 phòng ban
 * @param {Long} departmentId
 * @param {String} month - dạng 'yyyy-MM', ví dụ '2025-07'
 */
export const getBusyLeaveDaysApi = async (departmentId, month) => {
  try {
    const res = await api.get(`/leave-requests/busy-days?departmentId=${departmentId}&month=${month}`, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Lấy số dư nghỉ phép của bạn trong tháng
export const getLeaveBalanceApi = async (month) => {
  try {
    const res = await api.get(`/leave-requests/leave-balance?month=${month}`);
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Lấy chữ ký mẫu đã lưu của người dùng hiện tại (duyệt đơn)
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

// Lưu/chỉnh sửa chữ ký mẫu (base64) cho tài khoản hiện tại
export const saveMySignatureSampleApi = async (signatureBase64) => {
  try {
    const res = await api.post(
      "/leave-requests/my-signature-sample",
      { signatureBase64 },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Các đơn đang chờ HR xác nhận
export const getPendingHrApi = async () => {
  try {
    const res = await api.get("/leave-requests/pending-hr", {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// HR xác nhận duyệt sau khi người duyệt đã ký
export const hrConfirmLeaveRequestApi = async (id) => {
  try {
    const res = await api.post(
      `/leave-requests/${id}/hr-confirm`,
      null,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// HR từ chối xác nhận (khi đơn đang PENDING_HR)
export const hrRejectLeaveRequestApi = async (id, reason) => {
  try {
    const payload = reason ? { rejectReason: reason } : null; // gửi lý do nếu có
    const res = await api.post(
      `/leave-requests/${id}/hr-reject`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Nhân viên gửi yêu cầu hủy đơn (gửi email tới Người duyệt & HR)
export const requestCancelLeaveApi = async (id, reason) => {
  try {
    const res = await api.post(
      `/leave-requests/${id}/cancel-request`,
      { reason }, // BE nhận { reason }
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error?.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// HR hủy đơn nghỉ phép (chỉ HR có quyền)
export const hrCancelLeaveRequestApi = async (id) => {
  try {
    const res = await api.post(
      `/leave-requests/${id}/hr-cancel`,
      null,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};
