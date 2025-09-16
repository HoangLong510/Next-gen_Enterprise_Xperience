"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
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
import { useSelector } from "react-redux";
import {
  Search,
  TrendingUp,
  CalendarToday,
  ArrowBack,
  RequestQuote,
  CloudDownload,
  PictureAsPdf,
} from "@mui/icons-material";
import SignatureCanvas from "react-signature-canvas";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
  numToWords,
} from "~/utils/money";
import { translateReason } from "~/utils/translateApi";
import dayjs from "dayjs";

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
    "Board of Directors of Next-Gen Enterprise Experience Company"
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

  // Ma trận allowed cơ bản; siết thêm cho staff ở dưới
  const getAllowedTargets = useCallback((from, role) => {
    const s = new Set([from]);
    switch (from) {
      case "PLANNING":
        s.add("IN_PROGRESS");
        s.add("CANCELED");
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
    getTaskStatuses().then((list) => {
      const opts = list.map((s) => ({
        value: s,
        label: s
          .toLowerCase()
          .replace(/_/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase()),
      }));
      setStatusOptions(opts);
      setGrouped(opts.reduce((acc, o) => ({ ...acc, [o.value]: [] }), {}));
    });
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

  useEffect(() => {
    loadPhasesMeta();
  }, [loadPhasesMeta]);

  // Fetch + group tasks
  const fetchAndGroup = useCallback(async () => {
    if (!statusOptions.length) return;
    const pid = isStaffTasksPage ? selectedProject : projectId;
    if (!pid) return;

    const res = await getKanbanTasks(pid);
    let tasks = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
      ? res.data
      : [];

    if (phaseId) tasks = tasks.filter((t) => String(t.phaseId) === phaseId);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          (t.description || "").toLowerCase().includes(term)
      );
    }
    const next = statusOptions.reduce(
      (acc, o) => ({ ...acc, [o.value]: [] }),
      {}
    );
    tasks.forEach((t) => {
      if (!next[t.status]) next[statusOptions[0].value].push(t);
      else next[t.status].push(t);
    });
    setGrouped(next);
  }, [
    projectId,
    selectedProject,
    searchTerm,
    statusOptions,
    phaseId,
    isStaffTasksPage,
  ]);

  useEffect(() => {
    if (statusOptions.length && (!isStaffTasksPage || selectedProject)) {
      fetchAndGroup();
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

  const blockAllChange = useCallback(
    (phaseId) => {
      const info = nextPhaseInfo(phaseId);
      if (!info || !info.exists) return false;
      return (
        info.curStatus === "COMPLETED" &&
        info.status === "IN_PROGRESS" &&
        info.taskCount > 0
      );
    },
    [nextPhaseInfo]
  );

  // Evidence dialog open
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

    if (fromTaskStatus) {
      const s = getAllowedTargets(fromTaskStatus, account.role);

      // các rule chặn sẵn
      if (
        s.has("IN_PROGRESS") &&
        blockToInProgress(fromTaskStatus, taskPhaseId)
      ) {
        s.delete("IN_PROGRESS");
      }
      if (blockAllChange(taskPhaseId)) {
        for (const v of Array.from(s)) if (v !== fromTaskStatus) s.delete(v);
      }

      // Cho phép PLANNING → IN_REVIEW nếu đã có evidence HOẶC branch
      if (fromTaskStatus === "PLANNING" && taskObj) {
        if (hasBranch(taskObj)) s.add("IN_REVIEW");
        setAllowedDropSet(new Set(s));
        (async () => {
          const existed = await hasEvidence(taskObj.id);
          if (existed) {
            setAllowedDropSet((prev) => {
              const next = new Set(prev);
              next.add("IN_REVIEW");
              return next;
            });
          }
        })();
      } else {
        setAllowedDropSet(s);
      }
    } else {
      setAllowedDropSet(new Set());
    }
  };

  const handleDragOver = ({ over }) => {
    if (!over) {
      setOverColumn(null);
      setOverIndex(null);
      return;
    }
    const colId = grouped[over.id]
      ? over.id
      : over.data.current?.sortable?.containerId;
    if (
      !grouped[colId] ||
      (allowedDropSet.size && !allowedDropSet.has(colId))
    ) {
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

    // ❌ Staff Tasks page: chặn Completed hoàn toàn + chặn IN_REVIEW→COMPLETED
    if (
      isStaffTasksPage &&
      (toCol === "COMPLETED" || fromCol === "COMPLETED")
    ) {
      dispatch(
        setPopup({
          type: "error",
          message:
            "You don't have permission to change tasks in/from Completed.",
        })
      );
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

    if (
      toCol === "IN_REVIEW" &&
      (fromCol === "COMPLETED" || fromCol === "CANCELED")
    ) {
      dispatch(
        setPopup({
          type: "error",
          message:
            "Cannot move to In review from Completed or Canceled status.",
        })
      );
      setAllowedDropSet(new Set());
      return;
    }

    if (
      toCol === "IN_PROGRESS" &&
      ["COMPLETED", "CANCELED"].includes(fromCol)
    ) {
      if (blockToInProgress(fromCol, task.phaseId)) {
        alert(
          "Cannot switch back to In progress because the next phase is no longer in empty Planning."
        );
        setAllowedDropSet(new Set());
        return;
      }
    }

    if (fromCol !== toCol && blockAllChange(task.phaseId)) {
      alert(
        "The next phase has started and has tasks. It is not possible to change the task status in the completed phase."
      );
      setAllowedDropSet(new Set());
      return;
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
      const oldIdx = srcList.findIndex((t) => t.id === active.id);
      const newIdx = (grouped[toCol] || []).findIndex((t) => t.id === over.id);
      next[fromCol] = arrayMove(
        srcList,
        oldIdx,
        newIdx >= 0 ? newIdx : srcList.length - 1
      );
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
  const activeTask = activeId ? flattened.find((t) => t.id === activeId) : null;

  const advanceOptions = useMemo(() => {
    return (flattened || []).filter((t) => t && t.status !== "CANCELED");
  }, [flattened]);

  // ==== Tính khóa "Clear evidence" theo rule phase sau ====
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
            t.id === taskId
              ? { ...t, githubBranch: fullBranchName, branchCreated: true }
              : t
          );
        }
        return next;
      });
      setPendingTask((prev) =>
        prev && prev.id === taskId
          ? { ...prev, githubBranch: fullBranchName, branchCreated: true }
          : prev
      );
      refreshMeta();
    },
    [refreshMeta]
  );

  useEffect(() => {
    const interval = setInterval(() => {
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
      if (!advanceTask?.id)
        return setAdvanceError("You have not selected a task.");
      const amountNum = Number(advanceAmount || 0);
      if (!amountNum || amountNum <= 0)
        return setAdvanceError("Advance amount must be > 0.");
      if (!advanceReason?.trim())
        return setAdvanceError("Reason for advance is required.");
      if (!advanceDeadline)
        return setAdvanceError("Please choose a payment term.");
      if (!sigRef?.current || sigRef.current.isEmpty())
        return setAdvanceError("Please sign in the signature box.");

      setAdvanceBusy(true);
      setAdvanceError("");

      const signatureDataUrl = getSignatureDataUrl(sigRef);
      if (!signatureDataUrl) {
        setAdvanceError("Could not get signature. Please re-sign.");
        return;
      }

      const translatedReason = await translateReason(advanceReason.trim());

      function formatVietnameseDate(date) {
        return dayjs(date).format("[ngày] DD [tháng] MM [năm] YYYY");
      }
      const formattedDeadline = formatVietnameseDate(advanceDeadline);

      const payload = {
        taskId: advanceTask.id,
        unitName: "Công ty Cổ phần Trải nghiệm Doanh nghiệp Next-Gen",
        departmentOrAddress: "181 Cao Thắng, Phường 12, Quận 10, TP.HCM",
        recipient,
        amount: amountNum,
        amountText: numToWords(amountNum),
        reason: translatedReason,
        repaymentDeadlineStr: formattedDeadline,
        signatureDataUrl,
      };
      console.log(payload);
      const res = await createCashAdvanceApi(payload);
      if (res?.status !== 200) {
        setAdvanceError(res?.message || "Sending proposal failed.");
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
        setPopup({
          type: "success",
          message: "The advance request has been sent.",
        })
      );
    } catch (e) {
      console.error(e);
      setAdvanceError("There was an error sending. Please try again.");
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

        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Paper
            sx={{
              p: 1.5,
              background: "linear-gradient(135deg,#118D57,#10B981)",
            }}
          >
            <TrendingUp sx={{ color: "#fff", fontSize: 28 }} />
          </Paper>
          <Typography variant="h5" fontWeight={700}>
            Project Kanban Board
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
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

          {isStaffTasksPage && (
            <FormControl
              size="small"
              sx={{
                width: { xs: 320, sm: 360, md: 420 },
                minWidth: 280,
                ml: "auto",
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
            Send advance application
          </Button>
        </Paper>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Box sx={{ display: "flex", gap: 3, overflowX: "auto", p: 1 }}>
            {visibleStatusOptions.map(({ value, label }) => (
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
                  droppableDisabled={
                    allowedDropSet.size ? !allowedDropSet.has(value) : false
                  }
                />
              </SortableContext>
            ))}
          </Box>

          <DragOverlay>
            {activeTask && (
              <TaskCard project={activeTask} onTitleClick={() => {}} />
            )}
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
          canUpload={["PLANNING", "IN_PROGRESS", "IN_REVIEW"].includes(
            pendingTask?.status
          )}
          canClearEvidence={!lockClearEvidence}
          canCreateBranch={canCreateBranch}
          onClose={() => {
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
            await refreshMeta();
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
            setRecipient(
              "Board of Directors of Next-Gen Enterprise Experience Company"
            );
            sigRef?.current?.clear();
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Request for advance payment (Form No. 03-TT)
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2}>
              {advanceError && <Alert severity="error">{advanceError}</Alert>}

              <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Unit:</strong> Next-Gen Enterprise Experience
                    </Typography>
                    <Typography variant="body2">
                      <strong>Department (or Address):</strong> 181 Cao Thang,
                      Ward 12, District 10, Ho Chi Minh
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{ textAlign: { xs: "left", md: "right" } }}
                  >
                    <Typography variant="body2">
                      <em>Form No. 03-TT (TT 133/2016/TT-BTC)</em>
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
                    label="Select Task to advance"
                    placeholder="Type the task name..."
                  />
                )}
              />

              <TextField
                label="Dear"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                fullWidth
              />

              {(() => {
                const { fullName, title } = getAccountFullNameAndTitle(account);
                return (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="My name is"
                        value={fullName}
                        fullWidth
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Position"
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
                    label="Advance request (VND)"
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
                      ? `In words: ${numToWords(Number(advanceAmount))}`
                      : "Text will appear here"}
                  </Typography>
                </Grid>
              </Grid>

              <TextField
                label="Reason for advance"
                multiline
                minRows={2}
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
                placeholder="For example: Buying materials for tasks, travel expenses,..."
                fullWidth
              />
              <TextField
                label="Payment term"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={advanceDeadline || ""}
                onChange={(e) => setAdvanceDeadline(e.target.value)}
                fullWidth
              />

              {/* Ký */}
              <Box>
                <Typography fontWeight={600} mb={1}>
                  Person requesting advance payment - Sign
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
                    Delete signature
                  </Button>
                  <Button
                    onClick={() =>
                      sigRef?.current?.fromData(sigRef?.current?.toData())
                    }
                  >
                    Smoothing strokes
                  </Button>
                </Stack>
              </Box>
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
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={advanceBusy}
              onClick={handleSubmitAdvance}
            >
              Send to accountant
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
