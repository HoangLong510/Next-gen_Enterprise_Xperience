// src/components/project/KanbanForm.jsx
"use client";


import { setPopup } from "~/libs/features/popup/popupSlice";

/**
 * KanbanForm.jsx – FULL
 *  1) PM/Manager/Admin vẫn có thể kéo vào CANCELED dù phase bị "khóa chuỗi".
 *  2) EMP/HOD KHÔNG được click vào task ở trạng thái COMPLETED hoặc CANCELED (disable click).
 *  3) Khi mở review dialog: nếu phase của task đã COMPLETED thì PM/Manager/Admin xem được nhưng tất cả field bị disable (view-only).
 *  4) Chỉ hiển thị ô tạo Branch khi dự án đã gắn repo GitHub hợp lệ (owner/repo).
 */

import React, { useEffect, useState, useCallback,useRef, useMemo } from "react";
import Tooltip from '@mui/material/Tooltip';
import {
  Box,
  Container,
  Typography,
  Stack,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Autocomplete,
  Alert,
  Tabs,
  Tab,
  Grid,
} from "@mui/material";
import {
  RequestQuote,
  CloudDownload,
  PictureAsPdf,
  Search,  
} from "@mui/icons-material";
import CircularProgress from '@mui/material/CircularProgress';
import SignatureCanvas from "react-signature-canvas";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useDispatch, useSelector } from "react-redux";
import { TrendingUp, CalendarToday, ArrowBack, Refresh as RefreshIcon } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import KanbanColumn from "~/components/project/form/KanbanColumn";
import TaskCard from "~/components/project/form/TaskCard";
import TaskReviewDialog from "~/components/project/form/TaskReviewDialog";
import { createCashAdvanceApi } from "~/services/cash-advance.service";
import { uploadEvidence, listEvidence } from "~/services/task-evidence.service";
import { formatStatus, getStatusColor } from "~/utils/project.utils";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import {
  getKanbanTasks,
  updateKanbanOrder,
  updateTaskStatus,
  getTaskStatuses,
} from "~/services/task.service.js";
import {
  getKanbanProjects,
  getProjectDetail,
} from "~/services/project.service.js";
import {
  getPhaseDetail,
  getPhasesWithTasksByProject,
} from "~/services/phase.service.js";
import {
  getAccountFullNameAndTitle,
  formatNumber,
  numToVietnameseWords,
} from "~/utils/money";

function trimCanvasSafe(src) {
  if (!src) return null;
  const ctx = src.getContext("2d");
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;

  let top = h,
    left = w,
    right = 0,
    bottom = 0,
    hasInk = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]; // kênh alpha
      if (a !== 0) {
        hasInk = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (!hasInk) return null;

  const tw = right - left + 1;
  const th = bottom - top + 1;

  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const octx = out.getContext("2d");
  octx.putImageData(ctx.getImageData(left, top, tw, th), 0, 0);
  return out;
}

function getSignatureDataUrl(sigRef) {
  const base = sigRef?.current?.getCanvas?.();
  if (!base) return null;
  const trimmed = trimCanvasSafe(base);
  return (trimmed || base).toDataURL("image/png");
}

export default function KanbanForm() {
  const { t: tMsg } = useTranslation("messages");
  const { t: tPhases } = useTranslation("phases");
  const dispatch = useDispatch();

  const [statusOptions, setStatusOptions] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  const [projectList, setProjectList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projLoading, setProjLoading] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingCancelTask, setPendingCancelTask] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const [projectInfo, setProjectInfo] = useState(null);
  const [phaseInfo, setPhaseInfo] = useState(null);
  const [phasesMeta, setPhasesMeta] = useState([]);

  const [allowedDropSet, setAllowedDropSet] = useState(new Set());

  const { projectId, phaseId } = useParams();

  // ===== Cash Advance dialog =====
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceTask, setAdvanceTask] = useState(null);
  const [recipient, setRecipient] = useState(
    "Ban lãnh đạo Công ty Next-Gen Enterprise Experience"
  );
  const [advanceDeadline, setAdvanceDeadline] = useState(null);
  const sigRef = useRef(null);

  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceBusy, setAdvanceBusy] = useState(false);
  const [advanceError, setAdvanceError] = useState("");

  const account = useSelector((s) => s.account?.value);
  const navigate = useNavigate();

  const isStaffMode = ["EMPLOYEE", "HOD"].includes(account?.role);
  const isStaffTasksPage = isStaffMode && !projectId; // trang Utilities/Tasks cho EMP/HOD

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const NAME_CLAMP_SX = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    lineHeight: 1.3,
  };

  // Helper: label trạng thái
  const prettyStatus = useCallback(
    (code) => {
      const key = `statusLabel.${code}`;
      const translated = tProj(key);
      if (projReady && translated && translated !== key) return translated;
      return code?.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    },
    [tProj, projReady, i18n.language]
  );

  // Allowed targets theo status gốc

  const getAllowedTargets = useCallback((from, role) => {
    const s = new Set([from]);
    switch (from) {
      case "PLANNING":
        s.add("IN_PROGRESS");
        s.add("CANCELED");
        s.add("IN_REVIEW");

        break;
      case "IN_PROGRESS":
        s.add("CANCELED");
        s.add("IN_REVIEW");
        break;
      case "IN_REVIEW":
        s.add("COMPLETED");
        s.add("CANCELED");
        s.add("IN_PROGRESS");
        break;
      case "COMPLETED":
        s.add("IN_PROGRESS");
        break; // UI không cho IN_REVIEW
      case "CANCELED":
        s.add("PLANNING");
        s.add("IN_PROGRESS");
        break; // UI không cho IN_REVIEW
        break;
      case "CANCELED":
        s.add("PLANNING");
        s.add("IN_PROGRESS");
        break;
      default:
        break;
    }
    if (from === "COMPLETED" || from === "CANCELED") s.delete("IN_REVIEW");

    // Cả EMPLOYEE & HOD: không được Completed/Canceled
    if (role === "EMPLOYEE" || role === "HOD") {
      s.delete("COMPLETED");
      s.delete("CANCELED");
    }
    return s;
  }, []);

  // Load status list
  useEffect(() => {
    (async () => {
      try {
        const list = await getTaskStatuses();
        const opts = list.map((s) => ({ value: s, label: prettyStatus(s) }));
        setStatusOptions(opts);
        setGrouped(opts.reduce((acc, o) => ({ ...acc, [o.value]: [] }), {}));
      } catch {
        const fallback = ["PLANNING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELED"];
        const opts = fallback.map((s) => ({ value: s, label: prettyStatus(s) }));
        setStatusOptions(opts);
        setGrouped(opts.reduce((acc, o) => ({ ...acc, [o.value]: [] }), {}));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Project info (khi vào theo route /projects/:id/kanban)
  const loadProjectInfo = useCallback(async () => {
    if (projectId) {
      const res = await getProjectDetail(projectId);
      if (res.status === 200) setProjectInfo(res.data);
    } else {
      setProjectInfo(null);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectInfo();
  }, [loadProjectInfo]);

  // Phase info (view theo route /phase/:phaseId)
  const loadPhaseInfo = useCallback(async () => {
    if (phaseId) {
      const resp = await getPhaseDetail(phaseId);
      if (resp.status === 200 && resp.data) setPhaseInfo(resp.data);
    } else {
      setPhaseInfo(null);
    }
  }, [phaseId]);

  useEffect(() => {
    loadPhaseInfo();
  }, [loadPhaseInfo]);

  // Phases metadata
  const loadPhasesMeta = useCallback(async () => {
    const pid = isStaffTasksPage ? selectedProject : projectId;
    if (!pid) return;
    const res = await getPhasesWithTasksByProject(pid);
    if (res?.status === 200 && Array.isArray(res.data)) setPhasesMeta(res.data);
    else setPhasesMeta([]);
  }, [projectId, selectedProject, isStaffTasksPage]);

  useEffect(() => { loadPhasesMeta(); }, [loadPhasesMeta]);

  // 🔒 Rule "khóa chuỗi"
  const isPhaseLocked = useCallback((curPhaseId) => {
    if (!Array.isArray(phasesMeta) || !curPhaseId) return false;
    const cur = phasesMeta.find((p) => String(p.id) === String(curPhaseId));
    if (!cur) return false;
    const next = phasesMeta.find((p) => p.sequence === cur.sequence + 1);
    const nextHasTasks = Array.isArray(next?.tasks) && next.tasks.length > 0;
    return !!(next && cur.status === "COMPLETED" && next.status === "IN_PROGRESS" && nextHasTasks);
  }, [phasesMeta]);


  // ===== Fetch & group tasks =====
  const fetchAndGroup = useCallback(async () => {
    if (!statusOptions.length) return;
    const pid = isStaffTasksPage ? selectedProject : projectId;
    if (!pid) return;
    setLoading(true);
    try {
      const res = await getKanbanTasks(pid);
      let tasks = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

      // lọc theo phase
      if (phaseId) tasks = tasks.filter((t) => String(t.phaseId) === String(phaseId));

      // lọc theo search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.name?.toLowerCase().includes(term) ||
            (t.description || "").toLowerCase().includes(term) ||
            (t.assigneeName || "").toLowerCase().includes(term)
        );
      }

      const next = statusOptions.reduce((acc, o) => ({ ...acc, [o.value]: [] }), {});
      tasks.forEach((t) => {
        if (next[t.status]) next[t.status].push(t);
        else next[statusOptions[0].value].push(t);
      });
      setGrouped(next);
    } finally {
      setLoading(false);

    }
  }, [fetchAndGroup, selectedProject, isStaffTasksPage, statusOptions.length]);

  // Staff: load project list có phase IN_PROGRESS và có task assign cho user
  useEffect(() => {
    if (!isStaffTasksPage) return;

    const normalizeToArray = (x) => {
      if (Array.isArray(x)) return x;
      if (Array.isArray(x?.data)) return x.data;
      if (Array.isArray(x?.data?.data)) return x.data.data;
      return [];
    };

    setProjLoading(true);
    getKanbanProjects()
      .then((raw) => {
        const list = normalizeToArray(raw);
        setProjectList(list);
        if (list.length) setSelectedProject(list[0].id);
      })
      .catch(() => {
        setProjectList([]);
        setSelectedProject(null);
      })
      .finally(() => setProjLoading(false));
  }, [isStaffTasksPage]);


  // ===== Helpers: phase sau của 1 phase =====
  const nextPhaseInfo = useCallback(
    (curPhaseId) => {
      if (!Array.isArray(phasesMeta) || !curPhaseId) return null;
      const cur = phasesMeta.find((p) => String(p.id) === String(curPhaseId));
      if (!cur) return null;
      const next = phasesMeta.find((p) => p.sequence === cur.sequence + 1);
      if (!next) return { exists: false };
      return {
        exists: true,
        status: next.status,
        taskCount: Array.isArray(next.tasks) ? next.tasks.length : 0,
        curStatus: cur.status,
      };
    },
    [phasesMeta]
  );

  const blockToInProgress = useCallback(
    (fromTaskStatus, phaseId) => {
      if (!["COMPLETED", "CANCELED"].includes(fromTaskStatus)) return false;
      const info = nextPhaseInfo(phaseId);
      if (!info || !info.exists) return false;
      const ok = info.status === "PLANNING" && info.taskCount === 0;
      return !ok;
    },
    [nextPhaseInfo]
  );

  // ===== helper: phase của task đã completed chưa?
  const isTaskPhaseCompleted = useCallback((task) => {
    if (!task) return false;
    const ph = phasesMeta.find((p) => String(p.id) === String(task.phaseId));
    return ph?.status === "COMPLETED";
  }, [phasesMeta]);

  // ===== Click mở dialog
  //  - EMP/HOD: KHÔNG cho click task COMPLETED hoặc CANCELED
  //  - Role khác: cho click bình thường
n
  const handleCardClick = (task) => {
    if (!task) return;
    setPendingTask(task);
    setReviewOpen(true);
  };

  const hasEvidence = async (taskId) => {
    try {
      const items = await listEvidence(taskId);
      return Array.isArray(items) && items.length > 0;
    } catch {
      return false;
    }
  };

  // helper check branch (FE)
  const hasBranch = (task) => !!(task?.branchCreated || task?.githubBranch);

  // ===== DnD =====
  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    const fromTaskStatus = active?.data?.current?.project?.status;
    const taskPhaseId = active?.data?.current?.project?.phaseId;
    const taskObj = active?.data?.current?.project;

    // 🔒 Nếu phase bị khóa:
    //  - EMP/HOD: chặn drag ngay.
    //  - PM/Manager/Admin: vẫn cho drag, nhưng sẽ siết allowedDropSet (chỉ còn CANCELED).
    if (taskObj && isPhaseLocked(taskObj.phaseId) && isStaffMode) {
      setAllowedDropSet(new Set());
    }
  };

  const handleDragOver = ({ over }) => {
    if (!over) {
      setOverColumn(null);
      setOverIndex(null);
      return;
    }

    const overId = String(over.id);
    const colId = grouped[overId] ? overId : over.data.current?.sortable?.containerId;
    if (!grouped[colId] || (allowedDropSet.size && !allowedDropSet.has(colId))) {
      setOverColumn(null);
      setOverIndex(null);
      return;
    }
    const idx = grouped[colId].findIndex((t) => t.id === over.id);
    setOverColumn(colId);
    setOverIndex(idx >= 0 ? idx : grouped[colId].length);
  };


  // gộp refresh meta
  const refreshMeta = useCallback(async () => {
    await Promise.all([
      fetchAndGroup(),
      loadPhasesMeta(),
      loadPhaseInfo(),
      loadProjectInfo(),
    ]);
  }, [fetchAndGroup, loadPhasesMeta, loadPhaseInfo, loadProjectInfo]);
  const handleDragEnd = async ({ active, over }) => {
    setOverColumn(null);
    setOverIndex(null);
    setActiveId(null);

    if (!over) {
      setAllowedDropSet(new Set());
      return;
    }

    const fromCol = active?.data?.current?.project?.status;

    let toCol = null;
    if (grouped[over.id]) {
      toCol = over.id;
    } else if ((grouped[fromCol] || []).some((t) => t.id === over.id)) {
      toCol = fromCol;
    } else {
      const cont = over.data.current?.sortable?.containerId;
      if (grouped[cont]) toCol = cont;
    }
    if (!toCol || !fromCol) {
      setAllowedDropSet(new Set());
      return;
    }
    // ❌ EMP/HOD không được move vào CANCELED
    if (isStaffMode && toCol === "CANCELED") {
      dispatch(setPopup({ type: "error", message: tTasks("errors.noPermissionChangeCanceled") || tTasks("errors.noPermissionChangeCompleted") }));

      setAllowedDropSet(new Set());
      return;
    }

    if (allowedDropSet.size && !allowedDropSet.has(toCol)) {
      setAllowedDropSet(new Set());
      return;
    }

    const srcList = grouped[fromCol] || [];
    const task = srcList.find((t) => t.id === active.id);
    if (!task) {
      setAllowedDropSet(new Set());
      return;
    }
    // Không cho từ COMPLETED/CANCELED sang IN_REVIEW
    if (toCol === "IN_REVIEW" && (fromCol === "COMPLETED" || fromCol === "CANCELED")) {
      dispatch(setPopup({ type: "warning", message: tTasks("errors.cannotMoveToInReviewFromDoneOrCanceled") }));

      setAllowedDropSet(new Set());
      return;
    }
    // COMPLETED/CANCELED -> IN_PROGRESS: check phase sau
    if (toCol === "IN_PROGRESS" && ["COMPLETED", "CANCELED"].includes(fromCol)) {
      if (blockToInProgress(fromCol, task.phaseId)) {
        dispatch(setPopup({ type: "warning", message: tTasks("errors.cannotMoveToInProgressNextPhaseNotPlanning") }));
        setAllowedDropSet(new Set());
        return;
      }
    }

    if (fromCol !== toCol && blockAllChange(task.phaseId)) {
      if (!(toCol === "CANCELED" && !isStaffMode)) {
        dispatch(setPopup({ type: "warning", message: tProj("errors.phaseLockedEditing") }));
        setAllowedDropSet(new Set());
        return;
      }
    }

    if (toCol === "CANCELED" && fromCol !== toCol) {
      setPendingCancelTask(task);
      setCancelConfirmOpen(true);
      setAllowedDropSet(new Set());
      return;
    }

    // nếu kéo sang IN_REVIEW mà chưa có evidence & branch → mở dialog
    if (toCol === "IN_REVIEW" && fromCol !== toCol) {
      const existed = await hasEvidence(task.id);
      const branched = hasBranch(task);
      if (!existed && !branched) {
        setPendingTask(task);
        setReviewOpen(true);
        setAllowedDropSet(new Set());
        return;
      }
    }

    // update UI lạc quan
    const next = { ...grouped };
    if (fromCol === toCol) {
      const oldIdx = (grouped[fromCol] || []).findIndex((t) => String(t.id) === String(active.id));
      const overIdx = (grouped[toCol] || []).findIndex((t) => String(t.id) === overId);
      next[fromCol] = arrayMove(grouped[fromCol], oldIdx, overIdx >= 0 ? overIdx : grouped[fromCol].length - 1);
    } else {
      next[fromCol] = srcList.filter((t) => t.id !== active.id);
      const dest = [...(grouped[toCol] || [])];
      const idx = dest.findIndex((t) => t.id === over.id);
      const moved = { ...task, status: toCol };
      if (idx >= 0) dest.splice(idx, 0, moved);
      else dest.push(moved);
      next[toCol] = dest;
    }
    setGrouped(next);

    try {
      if (fromCol !== toCol) {
        await updateTaskStatus(task.id, toCol);
      }
      await updateKanbanOrder((next[toCol] || []).map((t) => t.id));
      if (fromCol === toCol) {
        await updateKanbanOrder((next[fromCol] || []).map((t) => t.id));
      }
      await refreshMeta();
    } catch (err) {
      console.error("[DragEnd] API failed, revert UI.", err);
      await fetchAndGroup();
      await loadPhasesMeta();
      await loadPhaseInfo();
      await loadProjectInfo();
    } finally {
      setAllowedDropSet(new Set());
    }
  };

  const flattened = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const activeTask = activeId ? flattened.find((t) => String(t.id) === String(activeId)) : null;
const advanceOptions = useMemo(() => {
    return (flattened || []).filter((t) => t && t.status !== "CANCELED");
  }, [flattened])
  // ===== Lock clear evidence theo rule phase sau
  const curPhaseMeta = useMemo(() => {
    if (!pendingTask) return null;
    return phasesMeta.find((p) => String(p.id) === String(pendingTask.phaseId));
  }, [pendingTask, phasesMeta]);

  const nextPhaseMeta = useMemo(() => {
    if (!curPhaseMeta) return null;
    return phasesMeta.find((p) => p.sequence === curPhaseMeta.sequence + 1);
  }, [curPhaseMeta, phasesMeta]);

  const lockClearEvidence = !!(
    curPhaseMeta &&
    curPhaseMeta.status === "COMPLETED" &&
    nextPhaseMeta &&
    nextPhaseMeta.status === "IN_PROGRESS" &&
    (nextPhaseMeta.tasks?.length || 0) > 0
  );

  const selectedProjectInfo = useMemo(() => {
    const arr = Array.isArray(projectList) ? projectList : [];
    return arr.find((p) => String(p.id) === String(selectedProject));
  }, [projectList, selectedProject]);

  const canCreateBranch = useMemo(() => {
    const st = pendingTask?.status;
    if (!st) return false;
    return !["COMPLETED", "CANCELED"].includes(st);
  }, [pendingTask]);

  const handleBranchCreated = useCallback(
    (taskId, fullBranchName) => {
      setGrouped((prev) => {
        const next = {};
        for (const col of Object.keys(prev)) {
          next[col] = (prev[col] || []).map((t) =>
            String(t.id) === String(taskId) ? { ...t, githubBranch: fullBranchName, branchCreated: true } : t
          );
        }
        return next;
      });
      setPendingTask((prev) =>
        prev && String(prev.id) === String(taskId)
          ? { ...prev, githubBranch: fullBranchName, branchCreated: true }
          : prev
      );
      refreshMeta();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshMeta]);

  // Ẩn cột CANCELED trên trang Tasks (staff)
  const visibleStatusOptions = useMemo(() => {
    if (isStaffTasksPage) {
      return statusOptions.filter((o) => o.value !== "CANCELED");
    }
    return statusOptions;
  }, [statusOptions, isStaffTasksPage]);

  const handleSubmitAdvance = async () => {
    try {
      if (!advanceTask?.id) return setAdvanceError("Bạn chưa chọn task.");
      const amountNum = Number(advanceAmount || 0);
      if (!amountNum || amountNum <= 0)
        return setAdvanceError("Số tiền tạm ứng phải > 0.");
      if (!advanceReason?.trim())
        return setAdvanceError("Vui lòng nhập lý do tạm ứng.");
      if (!advanceDeadline)
        return setAdvanceError("Vui lòng chọn thời hạn thanh toán.");
      if (!sigRef?.current || sigRef.current.isEmpty())
        return setAdvanceError("Vui lòng ký vào ô chữ ký.");

      setAdvanceBusy(true);
      setAdvanceError("");

      const signatureDataUrl = getSignatureDataUrl(sigRef);
      if (!signatureDataUrl) {
        setAdvanceError("Không lấy được chữ ký. Vui lòng ký lại.");
        return;
      }
      const payload = {
        taskId: advanceTask.id,
        unitName: "Next-Gen Enterprise Experience",
        departmentOrAddress: "181 Cao Thắng, Phường 12, Quận 10, Hồ Chí Minh",
        recipient,
        amount: amountNum,
        amountText: numToVietnameseWords(amountNum),
        reason: advanceReason.trim(),
        repaymentDeadline: advanceDeadline,
        signatureDataUrl,
      };

      const res = await createCashAdvanceApi(payload);
      console.log(payload)
      if (res?.status !== 200) {
        setAdvanceError(res?.message || "Gửi đề nghị thất bại.");
        return;
      }

      // Reset & thông báo
      setAdvanceOpen(false);
      setAdvanceTask(null);
      setAdvanceAmount("");
      setAdvanceReason("");
      setAdvanceDeadline(null);
      sigRef?.current?.clear();
      await refreshMeta();
      dispatch(
        setPopup({ type: "success", message: "Đã gửi đề nghị tạm ứng." })
      );
    } catch (e) {
      console.error(e);
      setAdvanceError("Có lỗi khi gửi. Vui lòng thử lại.");
    } finally {
      setAdvanceBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#F8FAFC,#FEF2F2)",
      }}
    >
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Ẩn Back khi là trang Tasks của staff */}
        {!isStaffTasksPage && (
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              if (projectId) navigate(`/management/projects/${projectId}`);
              else navigate(-1);
            }}
            sx={{ mb: 1, textTransform: "none", fontWeight: 600 }}
          >
            Back To Project Detail
          </Button>
        )}
        {renderHeader()}

        {/* Project/Phase cards */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: { xs: "wrap", md: "nowrap" } }}>
          {projectInfo && (
            <Paper sx={{ flex: 1, p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {projectInfo.name}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CalendarToday fontSize="small" />
                  <Typography variant="body2">
                    {projectInfo.createdAt} – {projectInfo.deadline}
                  </Typography>
                </Stack>
                <Chip
                  label={formatStatus(projectInfo.status)}
                  size="small"
                  color={getStatusColor(projectInfo.status)}
                />
              </Stack>
            </Paper>
          )}

          {phaseInfo && (
            <Paper sx={{ flex: 1, p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {phaseInfo.name}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CalendarToday fontSize="small" />
                  <Typography variant="body2">{phaseInfo.deadline}</Typography>
                </Stack>
                <Chip
                  label={formatStatus(phaseInfo.status)}
                  size="small"
                  color={getStatusColor(phaseInfo.status)}
                />
              </Stack>
            </Paper>
          )}
        </Box>

        {/* Toolbar: Search + (Filter Project cho staff ở trang Tasks) */}
        <Paper
          sx={{
            mb: 2,
            p: 2,
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: { xs: 280, sm: 420, md: 560 } }}
          />

          {/* Filter Project (chỉ hiện cho EMP/HOD ở trang Tasks) */}
          {isStaffTasksPage && (
            <FormControl
              size="small"
              sx={{
                width: { xs: 320, sm: 360, md: 420 },
                minWidth: 280,
                ml: "auto", // đẩy sát bên phải
              }}
            >
              <InputLabel id="project-filter-label">Project</InputLabel>
              <Select
                labelId="project-filter-label"
                label="Project"
                value={selectedProject ?? ""}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                disabled={projLoading || (projectList?.length ?? 0) === 0}
                renderValue={(value) => {
                  const p = (
                    Array.isArray(projectList) ? projectList : []
                  ).find((x) => String(x.id) === String(value));
                  return (
                    <Box
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p?.name || ""}
                    >
                      {p?.name || ""}
                    </Box>
                  );
                }}
                sx={{
                  "& .MuiSelect-select": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    pr: 4,
                  },
                }}
                MenuProps={{
                  PaperProps: { sx: { maxWidth: 420 } },
                }}
              >
                {Array.isArray(projectList) && projectList.length > 0 ? (
                  projectList.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          minWidth: 0,
                          width: "100%",
                        }}
                        title={p.name}
                      >
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {p.name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    {projLoading ? "Loading..." : "No available projects"}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          )}
          <Button
            variant="contained"
            color="warning"
            startIcon={<RequestQuote />}
            onClick={() => setAdvanceOpen(true)}
          >
            Gửi đơn tạm ứng
          </Button>
        </Paper>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {loading ? (
            <Stack alignItems="center" py={6} spacing={1}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                {tt(tasksReady, tTasks, "loadingTasks", "Loading tasks...")}
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ display: "flex", gap: 3, overflowX: "auto", p: 1 }}>
              {visibleStatusOptions.map(({ value }) => {
                // localized label
                const label = prettyStatus(value);

                // Staff: cột CANCELED chỉ xem, không drop
                const forceDisabledCanceledForStaff = isStaffMode && value === "CANCELED";

                return (
                  <SortableContext
                    key={value}
                    items={(grouped[value] || []).map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <KanbanColumn
                      id={value}
                      title={label}
                      projects={grouped[value] || []}
                      onOpenTask={handleCardClick}
                      overColumn={overColumn}
                      overIndex={overIndex}
                      activeId={activeId}
                      // 1) Column drop disabled: EMP/HOD tại CANCELED, hoặc không thuộc allowedDropSet khi đang kéo
                      droppableDisabled={
                        forceDisabledCanceledForStaff ||
                        (allowedDropSet.size ? !allowedDropSet.has(value) : false)
                      }
                      // 2) Lock DRAG theo "khóa chuỗi" — chỉ khóa cho EMP/HOD
                      isTaskLocked={(task) => isStaffMode && isPhaseLocked(task.phaseId)}
                      // 3) Lock CLICK riêng cho EMP/HOD ở COMPLETED hoặc CANCELED
                      isTaskClickDisabled={(task) => isStaffMode && (task.status === "COMPLETED" || task.status === "CANCELED")}
                    />
                  </SortableContext>
                );
              })}
            </Box>
          )}

          <DragOverlay>
            {activeTask ? (
              <Box sx={{ width: 300 }}>
                <TaskCard project={activeTask} onTitleClick={() => {}} />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Confirm cancel */}
        <Dialog
          open={cancelConfirmOpen}
          onClose={() => {
            setCancelConfirmOpen(false);
            setPendingCancelTask(null);
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{tMsg("confirm-cancel-task-title")}</DialogTitle>
          <DialogContent>
            <Typography>{tMsg("confirm-cancel-task-message")}</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setCancelConfirmOpen(false);
                setPendingCancelTask(null);
              }}
              variant="outlined"
              color="inherit"
            >
              {tPhases("cancel")}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                try {
                  if (pendingCancelTask) {
                    await updateTaskStatus(pendingCancelTask.id, "CANCELED");
                    await refreshMeta();
                  }
                } finally {
                  setCancelConfirmOpen(false);
                  setPendingCancelTask(null);
                }
              }}
            >
              {tPhases("confirm")}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Evidence dialog */}
        <TaskReviewDialog
          open={reviewOpen}
          task={pendingTask}
          // View-only cho PM/Manager/Admin nếu phase của task đã COMPLETED
          readOnly={dialogReadOnly}
          // Upload/Clear: tắt hoàn toàn khi readOnly
          canUpload={
            !dialogReadOnly &&
            ["PLANNING", "IN_PROGRESS", "IN_REVIEW"].includes(pendingTask?.status)
          }
          canClearEvidence={
            !dialogReadOnly &&
            !!(
              pendingTask &&
              (() => {
                const cur = phasesMeta.find((p) => String(p.id) === String(pendingTask.phaseId));
                if (!cur) return true;
                const next = phasesMeta.find((p) => p.sequence === cur.sequence + 1);
                if (!next) return true;
                return !(
                  cur.status === "COMPLETED" &&
                  next.status === "IN_PROGRESS" &&
                  (next.tasks?.length || 0) > 0
                );
              })()
            )
          }
          canCreateBranch={!["COMPLETED", "CANCELED"].includes(pendingTask?.status)}
          onClose={(shouldRefresh) => {
            setReviewOpen(false);
            setPendingTask(null);
          }}
          onCancel={() => {
            setReviewOpen(false);
            setPendingTask(null);
            refreshMeta();
          }}
          onUploading={() => {}}
          onUploaded={async (files) => {
            await uploadEvidence(pendingTask.id, files);
            await refreshMeta(); // không auto đổi trạng thái
          }}
          projectPmId={projectInfo?.pmId ?? selectedProjectInfo?.pmId}
          repoLinked={projectInfo?.repoLink ?? selectedProjectInfo?.repoLink}
          repoLink={projectInfo?.repoLink ?? selectedProjectInfo?.repoLink}
          onBranchCreated={handleBranchCreated}
        />
        {/* Cash Advance dialog */}
        <Dialog
          open={advanceOpen}
          onClose={() => {
            if (advanceBusy) return;
            setAdvanceOpen(false);
            setAdvanceTask(null);
            setAdvanceAmount("");
            setAdvanceReason("");
            setAdvanceDeadline(null);
            setAdvanceError("");
            setRecipient("Ban lãnh đạo Công ty Next-Gen Enterprise Experience");
            sigRef?.current?.clear();
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Đề nghị tạm ứng (Mẫu số 03-TT)</DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              {advanceError && <Alert severity="error">{advanceError}</Alert>}

              {/* Thông tin cố định */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Đơn vị:</strong> Next-Gen Enterprise Experience
                    </Typography>
                    <Typography variant="body2">
                      <strong>Bộ phận (hoặc Địa chỉ):</strong> 181 Cao Thắng,
                      Phường 12, Quận 10, Hồ Chí Minh
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{ textAlign: { xs: "left", md: "right" } }}
                  >
                    <Typography variant="body2">
                      <em>Mẫu số 03-TT (TT 133/2016/TT-BTC)</em>
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Chọn task */}
              <Autocomplete
                options={advanceOptions}
                value={advanceTask}
                onChange={(_, v) => setAdvanceTask(v)}
                getOptionLabel={(o) => (o?.name ? o.name : "")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn Task để tạm ứng"
                    placeholder="Gõ tên task..."
                  />
                )}
              />

              {/* Kính gửi */}
              <TextField
                label="Kính gửi"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                fullWidth
              />

              {/* Họ tên + chức vụ auto từ account */}
              {(() => {
                const { fullName, title } = getAccountFullNameAndTitle(account);
                return (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Tên tôi là"
                        value={fullName}
                        fullWidth
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Chức vụ"
                        value={title}
                        fullWidth
                        disabled
                      />
                    </Grid>
                  </Grid>
                );
              })()}

              {/* Số tiền + chữ */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Đề nghị tạm ứng (VNĐ)"
                    type="number"
                    fullWidth
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={6}
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Typography variant="body2">
                    {Number(advanceAmount) > 0
                      ? `Bằng chữ: ${numToVietnameseWords(
                          Number(advanceAmount)
                        )}`
                      : "Bằng chữ sẽ hiển thị ở đây"}
                  </Typography>
                </Grid>
              </Grid>

              {/* Lý do & Thời hạn thanh toán */}
              <TextField
                label="Lý do tạm ứng"
                multiline
                minRows={2}
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
                placeholder="Ví dụ: Mua vật tư cho task, chi phí đi lại,..."
                fullWidth
              />
              <TextField
                label="Thời hạn thanh toán"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={advanceDeadline || ""}
                onChange={(e) => setAdvanceDeadline(e.target.value)}
                fullWidth
              />

              {/* Ký */}
              <Box>
                <Typography fontWeight={600} mb={1}>
                  Người đề nghị tạm ứng – Ký tên
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 1, width: "100%", height: 160 }}
                >
                  <SignatureCanvas
                    ref={sigRef}
                    canvasProps={{
                      width: 700,
                      height: 140,
                      style: { width: "100%", height: "140px" },
                    }}
                    backgroundColor="#fff"
                    penColor="black"
                  />
                </Paper>
                <Stack direction="row" spacing={1} mt={1}>
                  <Button onClick={() => sigRef?.current?.clear()}>
                    Xóa chữ ký
                  </Button>
                  <Button
                    onClick={() =>
                      sigRef?.current?.fromData(sigRef?.current?.toData())
                    }
                  >
                    Làm mịn nét
                  </Button>
                </Stack>
              </Box>

              {/* Gợi ý chữ ký khác (tùy chọn) */}
              {/* Có thể dùng getMySignatureSampleApi/saveMySignatureSampleApi như module nghỉ phép của bạn */}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => {
                if (advanceBusy) return;
                setAdvanceOpen(false);
                setAdvanceTask(null);
                setAdvanceAmount("");
                setAdvanceReason("");
                setAdvanceDeadline(null);
                setAdvanceError("");
                sigRef?.current?.clear();
              }}
              color="inherit"
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              disabled={advanceBusy}
              onClick={handleSubmitAdvance}
            >
              Gửi kế toán
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
