import api from "~/utils/axios";

export const getAccountsByRolesApi = async (roles = []) => {
    try {
        // roles là mảng ['HOD', 'MANAGER']...
        const params = roles.map(role => `roles=${role}`).join('&');
        const res = await api.get(`/accounts/by-roles?${params}`);
        return res.data;
    } catch (error) {
        if (error.response) return error.response.data;
        return { status: 500, message: "server-is-busy" };
    }
}
