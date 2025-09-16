// ~/services/phase.service.js
import api from "~/utils/axios.js";

/* =========================
   ERROR HANDLER (shared)
   ========================= */
const handleApiError = (error) => {
  if (error?.response) return error.response.data;
  return { status: 500, message: "server-is-busy" };
};

/* =========================
   CREATE / UPDATE
   ========================= */
export const createPhase = async (projectId, dto) => {
  try {
    const res = await api.post(`/phases/project/${projectId}`, dto);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updatePhase = async (phaseId, payload) => {
  try {
    const res = await api.put(`/phases/${phaseId}`, payload); // { name?, deadline?, status? }
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/* =========================
   READ
   ========================= */
export const getPhasesByProject = async (projectId) => {
  try {
    const res = await api.get(`/phases/project/${projectId}`);
    return res.data; // { status, data: PhaseDto[] }
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPhaseDetail = async (phaseId) => {
  try {
    const res = await api.get(`/phases/${phaseId}`);
    return res.data; // { status, data: PhaseDto }
  } catch (error) {
    return handleApiError(error);
  }
};

export const getPhasesWithTasksByProject = async (projectId) => {
  try {
    const res = await api.get(`/phases/project/${projectId}/with-tasks`);
    return res.data; // { status, data: PhaseWithTasksDto[] }
  } catch (error) {
    return handleApiError(error);
  }
};

/* =========================
   TRANSITIONS
   ========================= */
export const startPhase = async (phaseId) => {
  try {
    const res = await api.post(`/phases/${phaseId}/start`);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const completePhase = async (phaseId) => {
  try {
    const res = await api.post(`/phases/${phaseId}/complete`);
    return res.data;
  } catch (error) {
    return handleApiError(error);
  }
};
