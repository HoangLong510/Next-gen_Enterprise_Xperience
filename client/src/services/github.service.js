// ~/services/github.service.js
import api from "~/utils/axios.js";

/* =========================
   STATUS
   ========================= */
/** Kiểm tra người dùng đã kết nối GitHub token hay chưa */
export async function getGithubTokenStatus() {
  try {
    const res = await api.get("/github/token/status");
    return Boolean(res?.data?.connected);
  } catch {
    return false;
  }
}

/* =========================
   OAUTH
   ========================= */
/**
 * Khởi tạo đăng nhập GitHub; BE trả về { url } để redirect.
 * @param {{context: "project"|"task"|"user", id?: number, redirect?: string}} params
 */
export async function startGithubLogin({ context, id, redirect }) {
  const res = await api.get("/github/login", { params: { context, id, redirect } });
  if (res?.data?.url) {
    window.location.href = res.data.url;
    return;
  }
  throw new Error("cannot-start-github-oauth");
}
