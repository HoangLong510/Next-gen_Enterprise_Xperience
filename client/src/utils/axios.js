import axios from "axios"

const api = axios.create({
	baseURL: `${import.meta.env.VITE_SERVER_URL}/api`,
	timeout: 10000,
	withCredentials: true
})

// Biến kiểm tra có đang gọi refresh token hay không
let isRefreshing = false

// Hàng đợi các request bị lỗi 401
let waitingRequests = []

// Gọi lại tất cả các request đang chờ sau khi refresh xong
const retryWaitingRequests = (newAccessToken) => {
	waitingRequests.forEach((callback) => callback(newAccessToken))
	waitingRequests = []
}

api.interceptors.request.use(
	function (config) {
		const accessToken = localStorage.getItem("accessToken")
		if (accessToken) {
			config.headers["Authorization"] = `Bearer ${accessToken}`
		}
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
	async function (error) {
		const originalRequest = error.config

		// Nếu gặp lỗi 401 và chưa retry
		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!originalRequest.url.includes("/auth/refresh-token") &&
			!originalRequest.url.includes("/auth/login")
		) {
			originalRequest._retry = true

			const refreshToken = localStorage.getItem("refreshToken")
			if (!refreshToken) {
				// Không có refreshToken thì logout
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				window.location.href = "/login"
				return Promise.reject(error)
			}

			// Nếu đang gọi refresh, thì chờ
			if (isRefreshing) {
				return new Promise((resolve) => {
					waitingRequests.push((newToken) => {
						// Gắn token mới và gọi lại request cũ
						console.log(newToken)
						originalRequest.headers.Authorization = `Bearer ${newToken}`
						resolve(api(originalRequest))
					})
				})
			}

			// Nếu chưa refresh thì bắt đầu refresh
			isRefreshing = true

			try {
				// Gọi API refresh-token
				const res = await axios.get(
					`${import.meta.env.VITE_SERVER_URL}/api/auth/refresh-token`,
					{
						headers: {
							Authorization: `Bearer ${refreshToken}`
						}
					}
				)

				localStorage.setItem("accessToken", res.data.data.accessToken)
				localStorage.setItem("refreshToken", res.data.data.refreshToken)

				// Gọi lại các request đang chờ
				retryWaitingRequests(res.data.data.accessToken)

				// Gắn token mới vào request cũ rồi retry
				originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`
				return api(originalRequest)
			} catch (refreshError) {
				// Refresh token sai → logout
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				window.location.href = "/login"
				return Promise.reject(refreshError)
			} finally {
				isRefreshing = false
			}
		}
		return Promise.reject(error)
	}
)

export default api
