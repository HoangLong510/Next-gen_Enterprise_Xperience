"use client";


/**
 * KanbanForm.jsx – FULL
 *  1) PM/Manager/Admin vẫn có thể kéo vào CANCELED dù phase bị "khóa chuỗi".
 *  2) EMP/HOD KHÔNG được click vào task ở trạng thái COMPLETED hoặc CANCELED (disable click).
 *  3) Khi mở review dialog: nếu phase của task đã COMPLETED thì PM/Manager/Admin xem được nhưng tất cả field bị disable (view-only).
 *  4) Chỉ hiển thị ô tạo Branch khi dự án đã gắn repo GitHub hợp lệ (owner/repo).
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { Search, TrendingUp, CalendarToday, ArrowBack, Refresh as RefreshIcon } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import KanbanColumn from "~/components/project/form/KanbanColumn";
import TaskCard from "~/components/project/form/TaskCard";
import TaskReviewDialog from "~/components/project/form/TaskReviewDialog";

import { uploadEvidence, listEvidence } from "~/services/task-evidence.service";
import { getStatusColor } from "~/utils/project.utils";

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
import { getKanbanProjects, getProjectDetail } from "~/services/project.service.js";
import { getPhaseDetail, getPhasesWithTasksByProject } from "~/services/phase.service.js";

export default function KanbanForm() {
  const { t: tMsg } = useTranslation("messages");
  const { t: tProj, i18n, ready: projReady } = useTranslation("project");
  const { t: tTasks, ready: tasksReady } = useTranslation("tasks");
  const { t: tPhases } = useTranslation("phases");

  const tt = useCallback(
    (ready, tFn, key, fallback) => {
      const out = tFn(key);
      if (ready && out !== key) return out;
      return fallback ?? key;
    },
    []
  );

  // ====== Local state ======
  const [statusOptions, setStatusOptions] = useState([]);   // [{value,label}]
  const [grouped, setGrouped] = useState({});               // { STATUS: Task[] }
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
  const [loading, setLoading] = useState(false);

  const [advanceOpen, setAdvanceOpen] = useState(false);


  // Ghi nhớ ý định move-to-review
  const [pendingMoveToReview, setPendingMoveToReview] = useState(null);

  const { projectId, phaseId } = useParams();
  const account = useSelector((s) => s.account?.value);
  const navigate = useNavigate();

  // Staff mode (EMP/HOD)
  const isStaffMode = ["EMPLOYEE", "HOD"].includes(account?.role);
  const isStaffTasksPage = isStaffMode && !projectId;

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
  const dispatch = useDispatch();

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
        break;
      case "CANCELED":
        s.add("PLANNING");
        s.add("IN_PROGRESS");
        break;
      default:
        break;
    }
    if (from === "COMPLETED" || from === "CANCELED") s.delete("IN_REVIEW");

    // EMP/HOD không được Completed/Canceled
    if (role === "EMPLOYEE" || role === "HOD") {
      s.delete("COMPLETED");
      s.delete("CANCELED");
    }
    return s;
  }, []);

  // ===== Load status list =====
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

  // (Optional) danh sách project cho staff filter
  useEffect(() => {
    if (!isStaffTasksPage) return;
    (async () => {
      setProjLoading(true);
      try {
        const res = await getKanbanProjects();
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setProjectList(items);
        if (!selectedProject && items.length) setSelectedProject(items[0]?.id);
      } catch {
        setProjectList([]);
      } finally {
        setProjLoading(false);
      }
    })();
  }, [isStaffTasksPage, selectedProject]);

  // Project info
  const loadProjectInfo = useCallback(async () => {
    if (!projectId) {
      setProjectInfo(null);
      return;
    }
    try {
      const res = await getProjectDetail(projectId);
      if (res?.status === 200) setProjectInfo(res.data);
      else setProjectInfo(null);
    } catch {
      setProjectInfo(null);
    }
  }, [projectId]);
  useEffect(() => { loadProjectInfo(); }, [loadProjectInfo]);

  // Phase info
  const loadPhaseInfo = useCallback(async () => {
    if (!phaseId) {
      setPhaseInfo(null);
      return;
    }
    try {
      const resp = await getPhaseDetail(phaseId);
      if (resp?.status === 200 && resp.data) setPhaseInfo(resp.data);
      else setPhaseInfo(null);
    } catch {
      setPhaseInfo(null);
    }
  }, [phaseId]);
  useEffect(() => { loadPhaseInfo(); }, [loadPhaseInfo]);

  // Phases meta
  const loadPhasesMeta = useCallback(async () => {
    const pid = isStaffTasksPage ? selectedProject : projectId;
    if (!pid) {
      setPhasesMeta([]);
      return;
    }
    try {
      const res = await getPhasesWithTasksByProject(pid);
      if (res?.status === 200 && Array.isArray(res.data)) setPhasesMeta(res.data);
      else setPhasesMeta([]);
    } catch {
      setPhasesMeta([]);
    }
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
  }, [projectId, selectedProject, searchTerm, statusOptions, phaseId, isStaffTasksPage]);
  useEffect(() => {
    if (!statusOptions.length) return;
    if (isStaffTasksPage && !selectedProject) return;
    fetchAndGroup();
  }, [fetchAndGroup, selectedProject, isStaffTasksPage, statusOptions.length]);

  // next phase info helper
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

  // COMPLETED/CANCELED -> IN_PROGRESS bị chặn nếu phase sau không còn Planning rỗng
  const blockToInProgress = useCallback(
    (fromTaskStatus, phId) => {
      if (!["COMPLETED", "CANCELED"].includes(fromTaskStatus)) return false;
      const info = nextPhaseInfo(phId);
      if (!info || !info.exists) return false;
      const ok = info.status === "PLANNING" && info.taskCount === 0;
      return !ok;
    },
    [nextPhaseInfo]
  );

  // Mọi thay đổi bị chặn nếu "khóa chuỗi"
  const blockAllChange = useCallback(
    (phId) => {
      const info = nextPhaseInfo(phId);
      if (!info || !info.exists) return false;
      return info.curStatus === "COMPLETED" && info.status === "IN_PROGRESS" && info.taskCount > 0;
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
  const handleCardClick = (task) => {
    if (!task) return;
    if (isStaffMode && (task.status === "COMPLETED" || task.status === "CANCELED")) {
      dispatch(setPopup({ type: "warning", message: tProj("errors.viewCompletedNotAllowed") || "Bạn không thể mở task đã hoàn thành/đã hủy." }));
      return;
    }
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
  const hasBranch = (task) => !!(task?.branchCreated || task?.githubBranch);

  const refreshMeta = useCallback(async () => {
    await Promise.all([fetchAndGroup(), loadPhasesMeta(), loadPhaseInfo(), loadProjectInfo()]);
  }, [fetchAndGroup, loadPhasesMeta, loadPhaseInfo, loadProjectInfo]);

  const promoteToReview = useCallback(
    async (taskId) => {
      // UI lạc quan
      setGrouped((prev) => {
        const next = { ...prev };
        let movedTask = null;
        for (const col of Object.keys(next)) {
          const idx = (next[col] || []).findIndex((t) => String(t.id) === String(taskId));
          if (idx >= 0) {
            movedTask = { ...next[col][idx], status: "IN_REVIEW" };
            next[col] = [...next[col]];
            next[col].splice(idx, 1);
            break;
          }
        }
        if (movedTask) {
          next["IN_REVIEW"] = [...(next["IN_REVIEW"] || []), movedTask];
        }
        return next;
      });

      try {
        await updateTaskStatus(taskId, "IN_REVIEW");
      } catch {
        await fetchAndGroup();
      } finally {
        setPendingMoveToReview(null);
        await refreshMeta();
      }
    },
    [fetchAndGroup, refreshMeta]
  );

  // ===== DnD =====
  const handleDragStart = ({ active }) => {
    const taskObj = active?.data?.current?.project;

    // 🔒 Nếu phase bị khóa:
    //  - EMP/HOD: chặn drag ngay.
    //  - PM/Manager/Admin: vẫn cho drag, nhưng sẽ siết allowedDropSet (chỉ còn CANCELED).
    if (taskObj && isPhaseLocked(taskObj.phaseId) && isStaffMode) {
      setAllowedDropSet(new Set());
      setActiveId(null);
      dispatch(setPopup({ type: "warning", message: tProj("errors.phaseLockedEditing") }));
      return;
    }

    setActiveId(String(active.id));

    const fromTaskStatus = taskObj?.status;
    const taskPhaseId = taskObj?.phaseId;
    if (!fromTaskStatus) {
      setAllowedDropSet(new Set());
      return;
    }

    const s = getAllowedTargets(fromTaskStatus, account.role);

    // Siết rule theo phase
    if (s.has("IN_PROGRESS") && blockToInProgress(fromTaskStatus, taskPhaseId)) {
      s.delete("IN_PROGRESS");
    }

    // Nếu bị "khóa chuỗi":
    //  - EMP/HOD: chỉ giữ nguyên trạng (không đổi).
    //  - PM/Manager/Admin: chỉ cho chuyển sang CANCELED (ngoài ra giữ nguyên).
    if (blockAllChange(taskPhaseId)) {
      const keep = new Set([fromTaskStatus]);
      if (!isStaffMode) keep.add("CANCELED");
      for (const v of Array.from(s)) {
        if (!keep.has(v)) s.delete(v);
      }
    }

    // PLANNING -> IN_REVIEW nếu có evidence/branch
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
    const idx = grouped[colId].findIndex((t) => String(t.id) === overId);
    setOverColumn(colId);
    setOverIndex(idx >= 0 ? idx : grouped[colId].length);
  };

  const handleDragEnd = async ({ active, over }) => {
    setOverColumn(null);
    setOverIndex(null);
    setActiveId(null);

    if (!over) {
      setAllowedDropSet(new Set());
      return;
    }

    const srcTask = active?.data?.current?.project;


    // 🔒 Phase khóa → chỉ chặn EMP/HOD; PM/Manager/Admin tiếp tục (để hủy).
    if (srcTask && isPhaseLocked(srcTask.phaseId) && isStaffMode) {
      setAllowedDropSet(new Set());
      return;
    }

    const fromCol = srcTask?.status;
    let toCol = null;

    const overId = String(over.id);
    if (grouped[overId]) {
      toCol = overId;
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

    // Nếu cột đích không hợp lệ theo allowedDropSet
    if (allowedDropSet.size && !allowedDropSet.has(toCol)) {
      setAllowedDropSet(new Set());
      return;
    }

    const srcList = grouped[fromCol] || [];
    const task = srcList.find((t) => String(t.id) === String(active.id));
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

    // Block mọi chuyển đổi nếu "khóa chuỗi"
    //  - vẫn cho PM/Manager/Admin chuyển sang CANCELED
    if (fromCol !== toCol && blockAllChange(task.phaseId)) {
      if (!(toCol === "CANCELED" && !isStaffMode)) {
        dispatch(setPopup({ type: "warning", message: tProj("errors.phaseLockedEditing") }));
        setAllowedDropSet(new Set());
        return;
      }
    }

    // Xác nhận cancel (không phải staff)
    if (toCol === "CANCELED" && fromCol !== toCol && !isStaffMode) {
      setPendingCancelTask(task);
      setCancelConfirmOpen(true);
      setAllowedDropSet(new Set());
      return;
    }

    // Nếu chuyển vào IN_REVIEW mà thiếu evidence/branch => mở dialog
    if (toCol === "IN_REVIEW" && fromCol !== toCol) {
      const existed = await hasEvidence(task.id);
      const branched = hasBranch(task);
      if (!existed && !branched) {
        setPendingTask(task);
        setReviewOpen(true);
        setPendingMoveToReview(task.id);
        setAllowedDropSet(new Set());
        return;
      }
    }

    // ===== UI lạc quan
    const next = { ...grouped };
    if (fromCol === toCol) {
      const oldIdx = (grouped[fromCol] || []).findIndex((t) => String(t.id) === String(active.id));
      const overIdx = (grouped[toCol] || []).findIndex((t) => String(t.id) === overId);
      next[fromCol] = arrayMove(grouped[fromCol], oldIdx, overIdx >= 0 ? overIdx : grouped[fromCol].length - 1);
    } else {
      next[fromCol] = (grouped[fromCol] || []).filter((t) => String(t.id) !== String(active.id));
      const dest = [...(grouped[toCol] || [])];
      const idx = dest.findIndex((t) => String(t.id) === overId);
      const moved = { ...task, status: toCol };
      if (idx >= 0) dest.splice(idx, 0, moved);
      else dest.push(moved);
      next[toCol] = dest;
    }
    setGrouped(next);

    // ===== Persist
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

  // Task đang drag
  const flattened = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const activeTask = activeId ? flattened.find((t) => String(t.id) === String(activeId)) : null;

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
      // cập nhật local task
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
    },
    [refreshMeta]
  );


  const visibleStatusOptions = useMemo(() => statusOptions, [statusOptions]);

  // ===== Header / Toolbar UI =====
  const renderHeader = () => (
    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
      <Paper sx={{ p: 1.5, background: "linear-gradient(135deg,#118D57,#10B981)" }}>
        <TrendingUp sx={{ color: "#fff", fontSize: 28 }} />
      </Paper>
      <Typography variant="h5" fontWeight={700}>
        {tt(projReady, tProj, "kanbanTitle", "Project Kanban Board")}
      </Typography>
      <Box flex={1} />
      <Tooltip title={tt(projReady, tProj, "actions.refresh", "Refresh")}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refreshMeta()}
          sx={{ textTransform: "none" }}
        >
          {tt(projReady, tProj, "actions.refresh", "Refresh")}
        </Button>
      </Tooltip>
    </Stack>
  );

  // View-only cho PM/Manager/Admin nếu phase của task đã COMPLETED
  const dialogReadOnly = !isStaffMode && isTaskPhaseCompleted(pendingTask);

  // ✅ Kiểm tra repo hợp lệ của project (để truyền xuống dialog)
  const projectHasValidRepo = useMemo(() => {
    const url = (projectInfo?.repoLink || "").trim();
    return /^https:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/?$/i.test(url);
  }, [projectInfo?.repoLink]);

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg,#F8FAFC,#FEF2F2)" }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Back nút: ẩn trên trang Utilities/Tasks của staff */}
        {!isStaffTasksPage && (
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              if (projectId) navigate(`/management/projects/${projectId}`);
              else navigate(-1);
            }}
            sx={{ mb: 1, textTransform: "none", fontWeight: 600 }}
          >
            {tt(projReady, tProj, "backToProjectDetail", "Back to Project Detail")}
          </Button>
        )}

        {renderHeader()}

        {/* Project/Phase cards */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: { xs: "wrap", md: "nowrap" } }}>
          {projectInfo && (
            <Paper sx={{ flex: 1, p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                gutterBottom
                title={projectInfo.name}
                sx={NAME_CLAMP_SX}
              >
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
                  label={prettyStatus(projectInfo.status)}
                  size="small"
                  color={getStatusColor(projectInfo.status)}
                />
              </Stack>
            </Paper>
          )}

          {phaseInfo && (
            <Paper sx={{ flex: 1, p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                gutterBottom
                title={phaseInfo.name}
                sx={NAME_CLAMP_SX}
              >
                {phaseInfo.name}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CalendarToday fontSize="small" />
                  <Typography variant="body2">{phaseInfo.deadline}</Typography>
                </Stack>
                <Chip label={prettyStatus(phaseInfo.status)} size="small" color={getStatusColor(phaseInfo.status)} />
              </Stack>
            </Paper>
          )}
        </Box>

        {/* Toolbar: Search + Project filter (cho staff) */}
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
            placeholder={tt(projReady, tProj, "searchTasksPlaceholder", "Search tasks...")}
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
              <InputLabel id="project-filter-label">
                {tt(tasksReady, tTasks, "labels.project", "Project")}
              </InputLabel>
              <Select
                labelId="project-filter-label"
                label={tt(tasksReady, tTasks, "labels.project", "Project")}
                value={selectedProject ?? ""}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                disabled={projLoading || (projectList?.length ?? 0) === 0}
                renderValue={(value) => {
                  const p = (Array.isArray(projectList) ? projectList : []).find(
                    (x) => String(x.id) === String(value)
                  );
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
                    {projLoading
                      ? tt(projReady, tProj, "loading", "Loading...")
                      : tt(tasksReady, tTasks, "noAvailableProjects", "No available projects")}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          )}
        </Paper>

        {/* Kanban board */}
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

        {/* Evidence / Review dialog */}
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
            setPendingMoveToReview(null);
            if (shouldRefresh) {
              refreshMeta();
            }
          }}
          onCancel={() => {
            setReviewOpen(false);
            setPendingTask(null);
            setPendingMoveToReview(null);
            refreshMeta();
          }}
          onUploading={() => {}}
          onUploaded={async (files) => {
            if (!pendingTask) return;
            await uploadEvidence(pendingTask.id, files);
            if (pendingMoveToReview && String(pendingMoveToReview) === String(pendingTask.id)) {
              await promoteToReview(pendingTask.id);
            } else {
              await refreshMeta();
            }

          }}
          projectPmId={projectInfo?.pmId}
          // ✅ TRUYỀN boolean đã được validate + URL repo xuống dialog
          repoLinked={projectHasValidRepo}
          repoLink={projectInfo?.repoLink}
          onBranchCreated={async (taskId, fullBranchName) => {
            handleBranchCreated(taskId, fullBranchName);
            if (pendingMoveToReview && String(pendingMoveToReview) === String(taskId)) {
              await promoteToReview(taskId);
            }
          }}
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
        />
      </Container>
    </Box>
  );
}
