import api from "~/utils/axios"

export const loginApi = async (form) => {
	try {
		const res = await api.post("/auth/login", form, {
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

export const fetchAccountDataApi = async () => {
	try {
		const res = await api.get("/auth/fetch-data", {
			headers: {
				"Content-Type": "application/json",
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

export const logoutApi = async () => {
	try {
		const res = await api.get("/auth/logout", {
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

export const changePasswordApi = async (form) => {
	try {
		const res = await api.post("/auth/change-password", form, {
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
