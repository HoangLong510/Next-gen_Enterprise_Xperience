import api from "~/utils/axios";

export const checkInFaceApi = async (payload) => {
  try {
    const formData = new FormData();
    formData.append("accountId", payload.accountId);
    formData.append("image", payload.imageBlob);
    formData.append("latitude", payload.latitude);
    formData.append("longitude", payload.longitude);

    const res = await api.post("/attendance/check-in", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data; // trả data khi thành công
  } catch (error) {
    if (error.response) {
      // Lỗi HTTP từ server
      throw error.response.data; // ném lỗi chứa data server
    }
    throw error;
  }
};

export const checkInStatusApi = async (accountId) => {
  try {
    const res = await api.get("/attendance/check-in/status", {
      params: { accountId }
    });
    return res.data; // trả về true hoặc false
  } catch (error) {
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
