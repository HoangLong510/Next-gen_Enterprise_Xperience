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
