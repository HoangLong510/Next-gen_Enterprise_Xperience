import api from "~/utils/axios";

// Lấy danh sách account theo roles (GET, roles là mảng: ['HOD', 'MANAGER']...)
export const getAccountsByRolesApi = async (roles = []) => {
    try {
        const params = roles.map(role => `roles=${role}`).join('&');
        const res = await api.get(`/accounts/by-roles?${params}`);
        return res.data;
    } catch (error) {
        if (error.response) return error.response.data;
        return { status: 500, message: "server-is-busy" };
    }
}

// Lấy danh sách account phân trang (POST)
export const getAccountsPageApi = async (data) => {
    try {
        const res = await api.post("/accounts/get-accounts-page", data, {
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
        };
    }
}

// Lấy danh sách PM (GET, cần accessToken)
export const fetchPMsApi = async () => {
    try {
        const res = await api.get("/accounts/roles/PM", {
            headers: {
                "Content-Type": "application/json",
            }
        });
        return res.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        return { status: 500, message: "server-is-busy" };
    }
}
