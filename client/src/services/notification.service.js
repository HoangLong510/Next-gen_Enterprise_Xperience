import api from "~/utils/axios"

export const fetchNotificationsApi = async (username) => {
    try {
        const accessToken = localStorage.getItem("accessToken");
        const res = await api.get(`/notifications/${username}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        return res.data;
    } catch (err) {
        return { status: 500, data: [] };
    }
};


export const createNotification = async (data) => {
  try {
    const token = localStorage.getItem("accessToken")
    const res = await api.post(`/notifications`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    return res.data;
  } catch (error) {
    if (error.response) return error.response.data
    return { status: 500, message: "server-is-busy" }
  }
}


export const markNotificationAsRead = async (id) => {
  try {
    const res = await api.put(`/notifications/${id}/read`)
    return res.data
  } catch (error) {
    if (error.response) return error.response.data
    return { status: 500, message: "server-is-busy" }
  }
}
