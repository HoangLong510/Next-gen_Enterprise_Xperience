import api from "~/utils/axios";

/**
 * Lấy danh sách đơn nghỉ phép (có filter theo trạng thái và phân trang)
 * @param {Object} params
 *    - status: string ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') (optional)
 *    - page: number (bắt đầu từ 1) (optional)
 *    - size: number (optional)
 */
export const getLeaveRequestsApi = async (params = {}) => {
	try {
		const query = [];
		if (params.status) query.push(`status=${params.status}`);
		if (params.page) query.push(`page=${params.page}`);
		if (params.size) query.push(`size=${params.size}`);
		const queryString = query.length ? `?${query.join("&")}` : "";

		const res = await api.get(`/leave-requests${queryString}`, {
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

// Từ chối đơn nghỉ phép
export const rejectLeaveRequestApi = async (id) => {
	try {
		const res = await api.post(`/leave-requests/${id}/reject`, null, {
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

// Lấy số lượng đơn bạn cần duyệt (pending - dành cho HOD/MANAGER)
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
