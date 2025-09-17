// ~/services/github.service.js
import api from "~/utils/axios";

/**
 * Kiểm tra user đã connect GitHub (token) hay chưa
 * @returns {Promise<boolean>}
 */
export async function getGithubTokenStatus() {
  try {
    const res = await api.get("/github/token/status");
    return Boolean(res?.data?.connected);
  } catch {
    return false;
  }
}

/**
 * Bắt đầu flow login GitHub.
 * BE trả về { url } → điều hướng trình duyệt tới url đó.
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
