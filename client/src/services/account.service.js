import api from "~/utils/axios"

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
