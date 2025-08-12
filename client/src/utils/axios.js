import axios from "axios"

// Tạo instance của axios với cấu hình mặc định
const api = axios.create({
	baseURL: `${import.meta.env.VITE_SERVER_URL}/api`, // URL gốc của API lấy từ biến môi trường
	timeout: 10000, // Thời gian timeout: 10 giây
	withCredentials: true // Gửi kèm cookie nếu có
})

// Biến cờ để kiểm soát quá trình gọi refresh token (đảm bảo chỉ gọi 1 lần tại 1 thời điểm)
let isRefreshing = false

// Hàng đợi chứa các request bị lỗi 401 và đang chờ token mới
let waitingRequests = []

// Hàm gọi lại toàn bộ các request trong hàng đợi sau khi đã có accessToken mới
const retryWaitingRequests = (newAccessToken) => {
	waitingRequests.forEach((callback) => callback(newAccessToken)) // Gọi từng callback
	waitingRequests = [] // Xóa hàng đợi sau khi gọi xong
}

// Interceptor request: Tự động gắn accessToken vào header nếu có
api.interceptors.request.use(
	function (config) {
		const accessToken = localStorage.getItem("accessToken")
		if (accessToken) {
			// Gắn token vào header Authorization
			config.headers["Authorization"] = `Bearer ${accessToken}`
		}
		return config
	},
	function (error) {
		// Trả về lỗi nếu có lỗi khi cấu hình request
		return Promise.reject(error)
	}
)

// Interceptor response: Xử lý lỗi 401 và thực hiện refresh token nếu cần
api.interceptors.response.use(
	function (response) {
		// Nếu response hợp lệ thì trả về luôn
		return response
	},
	async function (error) {
		const originalRequest = error.config

		// Kiểm tra điều kiện để xử lý refresh token:
		// - Lỗi 401 (unauthorized)
		// - Request chưa từng được retry (_retry chưa có)
		// - Không phải là request refresh token hay login
		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!originalRequest.url.includes("/auth/refresh-token") &&
			!originalRequest.url.includes("/auth/login")
		) {
			originalRequest._retry = true // Đánh dấu là đã retry

			const refreshToken = localStorage.getItem("refreshToken")
			if (!refreshToken) {
				// Nếu không có refreshToken → đăng xuất
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				window.location.href = "/login"
				return Promise.reject(error)
			}

			// Nếu đang trong quá trình refresh → chờ cho đến khi refresh xong
			if (isRefreshing) {
				return new Promise((resolve) => {
					waitingRequests.push((newToken) => {
						// Khi có token mới, gắn lại vào header và gửi lại request
						originalRequest.headers.Authorization = `Bearer ${newToken}`
						resolve(api(originalRequest))
					})
				})
			}

			// Nếu chưa refresh → bắt đầu refresh token
			isRefreshing = true

			try {
				// Gửi request refresh-token
				const res = await axios.get(
					`${import.meta.env.VITE_SERVER_URL}/api/auth/refresh-token`,
					{
						headers: {
							Authorization: `Bearer ${refreshToken}`
						}
					}
				)

				// Lưu token mới vào localStorage
				localStorage.setItem("accessToken", res.data.data.accessToken)
				localStorage.setItem("refreshToken", res.data.data.refreshToken)

				// Gọi lại tất cả các request bị pending do lỗi 401
				retryWaitingRequests(res.data.data.accessToken)

				// Gửi lại request ban đầu với accessToken mới
				originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`
				return api(originalRequest)
			} catch (refreshError) {
				// Nếu refresh token cũng lỗi → đăng xuất
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				window.location.href = "/login"
				return Promise.reject(refreshError)
			} finally {
				// Reset biến cờ
				isRefreshing = false
			}
		}

		// Nếu không phải lỗi 401 hoặc đã retry rồi → trả về lỗi
		return Promise.reject(error)
	}
)

export default api
