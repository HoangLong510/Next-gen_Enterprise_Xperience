// src/services/cash-advance.service.js
import api from "~/utils/axios";

/* Helpers */
const ok = (res) => res.data;
const fail = (error) =>
  error?.response?.data ?? { status: 500, message: "server-is-busy" };

/* ================== Template ================== */
export const downloadCashAdvanceTemplateApi = async (taskId) => {
  try {
    const res = await api.get("/cash-advances/template", {
      params: { taskId },
      responseType: "blob",
    });
    const cd = res.headers["content-disposition"];
    let filename = "Advance_Payment.docx";
    if (cd) {
      const mUtf = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
      const m = cd.match(/filename=(?:\"([^\"]+)\"|([^;]+))/i);
      const raw = (mUtf && mUtf[1]) || (m && (m[1] || m[2]));
      if (raw)
        filename = decodeURIComponent(raw.trim().replace(/^"(.*)"$/, "$1"));
    }
    return { blob: res.data, filename };
  } catch (error) {
    return fail(error);
  }
};

export const downloadAdvanceTemplate = (taskId) => {
  try {
    return window.open(
      `${api.defaults.baseURL.replace(
        /\/$/,
        ""
      )}/cash-advances/template?taskId=${taskId}`,
      "_blank"
    );
  } catch (error) {
    return fail(error);
  }
};

/* ================== Create ================== */
export const createCashAdvanceApi = async (payload) => {
  try {
    const form = new FormData();
    form.append(
      "payload",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
    const res = await api.post("/cash-advances", form);
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const createCashAdvanceSimpleApi = async ({
  taskId,
  amount,
  reason,
  file,
}) => {
  try {
    const form = new FormData();
    form.append("taskId", String(taskId));
    form.append("amount", String(amount));
    if (reason) form.append("reason", reason);
    if (file) form.append("file", file);
    const res = await api.post("/cash-advances/simple", form);
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

/* ================== Lists ================== */
export const listAdvancesApi = async ({ status = "ALL", scope } = {}) => {
  try {
    const res = await api.get("/cash-advances", { params: { status, scope } });
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const listMyAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/my");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const listAccountantPendingAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/pending/accountant");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const listChiefPendingAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/pending/chief");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const listDirectorPendingAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/pending/director");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

/* ================== Decisions per role ================== */
export const accountantDecisionApi = async (id, approve, note) => {
  try {
    const res = await api.post(`/cash-advances/${id}/accountant-decision`, {
      approve,
      note,
    });
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const chiefDecisionApi = async (id, approve, note) => {
  try {
    const res = await api.post(`/cash-advances/${id}/chief-decision`, {
      approve,
      note,
    });
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const directorDecisionApi = async (id, approve, note) => {
  try {
    const res = await api.post(`/cash-advances/${id}/director-decision`, {
      approve,
      note,
    });
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};
