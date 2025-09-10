import api from "~/utils/axios"

// Tạo document (chỉ ADMIN)
export const createDocumentApi = async (form, accessToken) => {
	try {
		const res = await api.post("/documents/create", form, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`
			}
		})
		return res.data
	} catch (error) {
		if (error.response) {
			return error.response.data
		}
		return { status: 500, message: "server-is-busy" }
	}
}

export const previewDocumentApi = async (id, accessToken) => {
  try {
    const res = await api.get(`/documents/${id}/preview`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return res.data; // { data: "<html ...>" }
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

export const signDocumentApi = async (id, signature) => {
  try {
    const res = await api.post(`/documents/${id}/sign`, { signature });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

// Xem chi tiết document (ADMIN, MANAGER, PM)
export const fetchDocumentDetailApi = async (id) => {
	try {
		const res = await api.get(`/documents/${id}`);
		return res.data;
	} catch (error) {
		if (error.response) {
			return error.response.data;
		}
		return { status: 500, message: "server-is-busy" };
	}
}

export const downloadDocumentFileApi = async (id) => {
  try {
    const res = await api.get(`/documents/download/${id}`, {
      responseType: 'blob' // quan trọng: để nhận file dạng blob
    });
    return res;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return { status: 500, message: "server-is-busy" };
  }
}

export const fetchDocumentsPageApi = async (payload) => {
  try {
    const res = await api.post("/documents/get-documents-page", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    return { status: 500, message: "server-is-busy" };
  }
};


export const fetchMyDocumentsPageApi = async (payload) => {
	try {
		const res = await api.post("/documents/my/get-documents-page", payload, {
			headers: { "Content-Type": "application/json" }
		});
		return res.data;
	} catch (error) {
		if (error.response) {
			return error.response.data;
		}
		return { status: 500, message: "server-is-busy" };
	}
};

/** MANAGER ghi chú (NOTE) khi trạng thái NEW */
export const addManagerNoteApi = async (id, note) => {
  try {
    const res = await api.put(`/documents/${id}/note`, { note });
    return res.data; // ApiResponse
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/** SECRETARY chỉnh sửa document khi NEW (BE sẽ tự snapshot history) */
export const updateDocumentApi = async (id, payload) => {
  try {
    const res = await api.put(`/documents/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data; // ApiResponse
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};

/** Lấy lịch sử của document theo trang (ADMIN/MANAGER/SECRETARY/PM/ACCOUNTANT/HOD) */
export const fetchDocumentHistoriesPageApi = async (id, payload) => {
  try {
    const res = await api.post(`/documents/${id}/histories`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data; // ApiResponse { data: { histories, totalPage, ... } }
  } catch (error) {
    if (error.response) return error.response.data;
    return { status: 500, message: "server-is-busy" };
  }
};
