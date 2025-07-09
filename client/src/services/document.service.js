import api from "~/utils/axios"

// Xem tất cả (ADMIN, MANAGER)
export const fetchDocumentsApi = async (accessToken) => {
	try {
		const res = await api.get("/documents", {
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

// PM xem document liên quan
export const fetchMyDocumentsApi = async (accessToken) => {
	try {
		const res = await api.get("/documents/my", {
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
