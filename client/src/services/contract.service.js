import api from "~/utils/axios"

// Lấy danh sách hợp đồng (có thể nhận thêm params filter sau này)
export const fetchContractListApi = async (params = {}) => {
    try {
        const res = await api.get("/contracts", {
            params,
            headers: {
                "Content-Type": "application/json"
            }
        });
        return res.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        return {
            status: 500,
            message: "server-is-busy"
        }
    }
}

// Lấy chi tiết hợp đồng theo id
export const fetchContractDetailApi = async (id) => {
    try {
        const res = await api.get(`/contracts/${id}`, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return res.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        return {
            status: 500,
            message: "server-is-busy"
        }
    }
}

// Tạo mới hợp đồng
export const createContractApi = async (form) => {
    try {
        const res = await api.post("/contracts", form, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return res.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        return {
            status: 500,
            message: "server-is-busy"
        }
    }
}

// Cập nhật hợp đồng
export const updateContractApi = async (id, form) => {
    try {
        const res = await api.put(`/contracts/${id}`, form, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return res.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        return {
            status: 500,
            message: "server-is-busy"
        }
    }
}

// Xóa hợp đồng
export const deleteContractApi = async (id) => {
    try {
        const res = await api.delete(`/contracts/${id}`, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return res.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        return {
            status: 500,
            message: "server-is-busy"
        }
    }
}

