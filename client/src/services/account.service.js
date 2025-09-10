import api from "~/utils/axios"

// Lấy danh sách account theo roles (GET, roles là mảng: ['HOD', 'MANAGER']...)
export const getAccountsByRolesApi = async (roles = []) => {
	try {
		const params = roles.map((role) => `roles=${role}`).join("&")
		const res = await api.get(`/accounts/by-roles?${params}`)
		return res.data
	} catch (error) {
		if (error.response) return error.response.data
		return { status: 500, message: "server-is-busy" }
	}
}

// Lấy danh sách account phân trang (POST)
export const getAccountsPageApi = async (data) => {
	try {
		const res = await api.post("/accounts/get-accounts-page", data, {
			headers: {
				"Content-Type": "application/json"
			}
		})
		return res.data
	} catch (error) {
		if (error.response) {
			return error.response.data
		}
		return {
			status: 500,
			message: "server-is-busy"
		}
	}
}

// Lấy danh sách PM (GET, cần accessToken)
export const fetchPMsApi = async () => {
	try {
		const res = await api.get("/accounts/roles/PM", {
			headers: {
				"Content-Type": "application/json"
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

export const getAccountManagementDetailsApi = async (id) => {
	try {
		const res = await api.get(
			`/accounts/get-account-management-details/${id}`
		)
		return res.data
	} catch (error) {
		if (error.response) return error.response.data
		return { status: 500, message: "server-is-busy" }
	}
}

export const updateRoleApi = async (id, role) => {
	try {
		const res = await api.get(`/accounts/update-role/${id}/${role}`, {
			headers: {
				"Content-Type": "application/json"
			}
		})
		return res.data
	} catch (error) {
		if (error.response) return error.response.data
		return { status: 500, message: "server-is-busy" }
	}
}

export const resetPasswordApi = async (id) => {
	try {
		const res = await api.get(`/accounts/reset-password/${id}`, {
			headers: {
				"Content-Type": "application/json"
			}
		})
		return res.data
	} catch (error) {
		if (error.response) return error.response.data
		return { status: 500, message: "server-is-busy" }
	}
}

export const changeStatusApi = async (id) => {
	try {
		const res = await api.get(`/accounts/change-status/${id}`, {
			headers: {
				"Content-Type": "application/json"
			}
		})
		return res.data
	} catch (error) {
		if (error.response) return error.response.data
		return { status: 500, message: "server-is-busy" }
	}
}

export const logoutSessionApi = async (id, sessionId) => {
	try {
		const res = await api.get(
			`/accounts/logout-session/${id}/${sessionId}`,
			{
				headers: {
					"Content-Type": "application/json"
				}
			}
		)
		return res.data
	} catch (error) {
		if (error.response) return error.response.data
		return { status: 500, message: "server-is-busy" }
	}
}
