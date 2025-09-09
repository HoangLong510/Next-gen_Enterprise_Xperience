import api from "~/utils/axios";

/*  Helpers  */
const ok = (res) => res.data;
const fail = (error) =>
  error?.response?.data ?? { status: 500, message: "server-is-busy" };

/*  Template  */
export const downloadCashAdvanceTemplateApi = async (taskId) => {
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
};

export const downloadAdvanceTemplate = (taskId) =>
  window.open(
    `${api.defaults.baseURL.replace(
      /\/$/,
      ""
    )}/cash-advances/template?taskId=${taskId}`,
    "_blank"
  );

export const createCashAdvanceApi = async (payload) => {
  try {
    const form = new FormData();
    form.append(
      "payload",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
    const res = await api.post("/cash-advances", form);
    return res.data;
  } catch (err) {
    return err?.response?.data ?? { status: 500, message: "server-is-busy" };
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

/*  Lists  */

export const listAdvancesApi = async ({ status = "ALL", scope } = {}) =>
  api.get("/cash-advances", { params: { status, scope } }).then(ok).catch(fail);

export const listMyAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/my");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

export const listPendingAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/pending");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

/*  Update status   */
export const updateCashAdvanceStatusApi = async (id, body) => {
  try {
    const res = await api.patch(`/cash-advances/${id}/status`, body, {
      headers: { "Content-Type": "application/json" },
    });
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

/*  Flow gửi KTT  */
// POST /cash-advances/send-chief  body: { requestIds: number[] }
export const sendAdvancesToChiefApi = async ({ requestIds }) =>
  api.post('/cash-advances/send-to-chief', { requestIds }).then(ok).catch(fail);

// GET /cash-advances/chief/pending
export const listChiefPendingAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/chief/pending");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

// POST /cash-advances/{id}/chief-approve
export const chiefApproveAdvanceApi = async (id) => {
  try {
    const res = await api.post(`/cash-advances/${id}/chief-approve`);
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

/*  Flow gửi Giám đốc  */
// POST /cash-advances/send-director  body: { requestIds: number[] }
export const sendAdvancesToDirectorApi = async ({ requestIds }) =>
  api.post('/cash-advances/send-to-director', { requestIds }).then(ok).catch(fail);

// GET /cash-advances/director/pending
export const listDirectorPendingAdvancesApi = async () => {
  try {
    const res = await api.get("/cash-advances/director/pending");
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};

// POST /cash-advances/{id}/director-approve
export const directorApproveAdvanceApi = async (id) => {
  try {
    const res = await api.post(`/cash-advances/${id}/director-approve`);
    return ok(res);
  } catch (error) {
    return fail(error);
  }
};
