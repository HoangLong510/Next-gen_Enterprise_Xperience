import axios from "axios"

const api = axios.create({
	baseURL: `${import.meta.env.VITE_SERVER_URL}/api`,
	timeout: 3000,
	withCredentials: true
})

api.interceptors.request.use(
	function (config) {
		return config
	},
	function (error) {
		return Promise.reject(error)
	}
)

api.interceptors.response.use(
	function (response) {
		return response
	},
	function (error) {
		return Promise.reject(error)
	}
)

export default api
