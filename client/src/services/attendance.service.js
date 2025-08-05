import api from "~/utils/axios";

export const checkInFaceApi = async ({ accountId, imageBlob, latitude, longitude }) => {
  try {
    const formData = new FormData();
    formData.append("accountId", accountId);
    formData.append("image", imageBlob);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);

    const res = await api.post("/attendance/check-in", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data; // dữ liệu attendance object hoặc lỗi server
  } catch (error) {
    if (error.response) {
      throw error.response.data; // lỗi từ server
    }
    throw error;
  }
};

export const checkOutFaceApi = async ({ accountId, imageBlob }) => {
  try {
    const formData = new FormData();
    formData.append("accountId", accountId);
    formData.append("image", imageBlob);

    const res = await api.post("/attendance/check-out", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data; // attendance object sau check-out thành công
  } catch (error) {
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
};


export const getMyAttendancePageApi = async (payload) => {
  try {
    const res = await api.post("/attendance/get-my-attendance", payload);
    return res.data;
  } catch (error) {
    if (error.response) throw error.response.data;
    throw error;
  }
};

export const getAttendanceByIdApi = async (attendanceId) => {
  try {
    const res = await api.get(`/attendance/${attendanceId}`);
    return res.data;
  } catch (error) {
    if (error.response) throw error.response.data;
    throw error;
  }
};


export const getAttendanceTodayStatusApi = async (accountId) => {
  try {
    const res = await api.get("/attendance/today-status", {
      params: { accountId },
    });
    return res.data; // "NOT_CHECKED_IN", "CHECKED_IN", "CHECKED_OUT"
  } catch (error) {
    if (error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMissingCheckOutApi = async (fromDate, toDate) => {
  try {
    const params = {};
    if (fromDate) params.fromDate = fromDate; // yyyy-MM-dd
    if (toDate) params.toDate = toDate;       // yyyy-MM-dd

    const res = await api.get("/attendance/missing-checkout", { params });
    return res.data; // mảng Attendance
  } catch (error) {
    if (error.response) throw error.response.data;
    throw error;
  }
};

// Nhân viên gửi note giải trình cho thiếu check-out
export const submitMissingCheckOutNoteApi = async (attendanceId, note) => {
  try {
    const params = new URLSearchParams();
    params.append("attendanceId", attendanceId);
    params.append("note", note);

    const res = await api.post("/attendance/submit-missing-checkout-note", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return res.data; // Attendance đã update note
  } catch (error) {
    if (error.response) throw error.response.data;
    throw error;
  }
};

// HR duyệt hoặc từ chối giải trình thiếu check-out
export const resolveMissingCheckOutApi = async (attendanceId, note, approved) => {
  try {
    const params = new URLSearchParams();
    params.append("attendanceId", attendanceId);
    params.append("note", note);
    params.append("approved", approved);

    const res = await api.post("/attendance/resolve-missing-checkout", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    return res.data; // Attendance sau khi duyệt hoặc từ chối
  } catch (error) {
    if (error.response) throw error.response.data;
    throw error;
  }
};