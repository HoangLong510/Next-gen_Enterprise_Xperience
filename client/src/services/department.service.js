import api from "~/utils/axios"

export const getDepartmentsPageApi = async (body) => {
	try {
		const res = await api.post("/departments/get-departments-page", body, {
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

export const createDepartmentApi = async (form) => {
	try {
		const res = await api.post("/departments/create", form, {
			headers: {
				"Content-Type": "multipart/form-data"
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

export const toggleEmployeeToDepartmentApi = async (body) => {
	try {
		const res = await api.post(
			"/departments/toggle-add-or-remove-employee",
			body,
			{
				headers: {
					"Content-Type": "application/json"
				}
			}
		)
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
