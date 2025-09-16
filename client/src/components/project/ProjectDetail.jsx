// src/components/project/ProjectDetail.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Card,
  CardContent,
  Paper,
  Container,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore,
  CalendarToday,
  Assignment,
  TrendingUp,
  MoreVert,
  Edit,
  Group,
  PersonAdd,
  Search,
  Add,
  Schedule,
  AccessTime,
  ArrowBack,
  GitHub,
  Link as LinkIcon,
  OpenInNew,
<<<<<<< Updated upstream
  Bolt,
=======
  Visibility,
  Lock,
>>>>>>> Stashed changes
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import {
  getProjectDetail,
  linkRepoToProject,
} from "~/services/project.service";
import UpdateTaskDialog from "~/components/project/form/UpdateTaskDialog";
import { getProjectEmployees } from "~/services/project-employee.service";
import { getPhasesWithTasksByProject } from "~/services/phase.service";
import EmployeeProject from "~/components/project/form/EmployeeProject";
import EmployeeProjectAdd from "~/components/project/form/EmployeeProjectAdd";
import CreatePhaseDialog from "~/components/project/form/CreatePhaseDialog";
import CreateTaskDialog from "~/components/project/form/CreateTaskDialog";
import ProjectForm from "~/components/project/form/ProjectForm";
import UpdatePhaseDialog from "~/components/project/form/UpdatePhaseDialog";

import {
  formatStatus,
  getStatusColor,
  formatDate,
  calculateDaysRemaining,
  getDaysOverdue,
  isOverdue,
} from "~/utils/project.utils";

import { createQuickTask } from "~/services/project.service";
import { setPopup } from "~/libs/features/popup/popupSlice";
import {
  startGithubLogin,
  getGithubTokenStatus,
} from "~/services/github.service";
import QuickTaskAssignDrawer from "./QuickTaskAssignDrawer";

const TASK_CARD_HEIGHT = 72;

export default function ProjectDetail() {
  const { t } = useTranslation("project");
  const { id: projectId } = useParams();
  const dispatch = useDispatch();

  const me = useSelector((state) => state.account?.value);

  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const [openUpdatePhase, setOpenUpdatePhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);

  const [phases, setPhases] = useState([]);

  const [loadingPhases, setLoadingPhases] = useState(false);
  const [expandedPhaseId, setExpandedPhaseId] = useState(null);
  const [openCreatePhase, setOpenCreatePhase] = useState(false);
  const [previousDeadline, setPreviousDeadline] = useState(null);

  const [openAddTask, setOpenAddTask] = useState(false);
  const [currentPhaseForTask, setCurrentPhaseForTask] = useState(null);

  const [openUpdateTask, setOpenUpdateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    phaseId: null,
    taskId: null,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openViewMembers, setOpenViewMembers] = useState(false);

  const [openAddMembers, setOpenAddMembers] = useState(false);

  const [openEditForm, setOpenEditForm] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const [githubConnected, setGithubConnected] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");

<<<<<<< Updated upstream
  const [quicking, setQuicking] = useState(false);
  const [openQuickAssign, setOpenQuickAssign] = useState(false);

  // ======= Fetch data =======
=======
  // ========= Role-based capability =========
  const isPM = !!project?.pmId && !!me?.id && Number(me.id) === Number(project?.pmId);
  const canEditProject = ["ADMIN", "MANAGER", "PM"].includes(me?.role || "") || isPM;
  const isViewOnly = !canEditProject;

  // 🔒 EMP/HOD view-only menu & task features
  const isStaff = ["EMPLOYEE", "HOD"].includes(me?.role || "");

  // ❗Chỉ PM mới được phép link repo
  const canLinkRepo = isPM;

  // 🔤 Helpers dịch + màu cho mọi status (Project/Phase/Task). Task có thêm IN_REVIEW
  const statusLabel = (code, kind = "project") => {
    if (!code) return "";
    const key = `statusLabel.${code}`;
    const order = kind === "task" ? ["task", "project"] : ["project", "task"];
    for (const ns of order) {
      const val = t(`${ns}:${key}`);
      if (val && val !== `${ns}:${key}` && val !== key) return val;
    }
    return formatStatus(code);
  };

  const statusColor = (code) => {
    return getStatusColor(code) || (code === "IN_REVIEW" ? "secondary" : "default");
  };

  // ✅ Chỉ coi là "có repo" khi URL GitHub hợp lệ (owner/repo)
  const hasValidRepo = useMemo(() => {
    const url = (project?.repoLink || "").trim();
    return /^https:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/?$/i.test(url);
  }, [project?.repoLink]);

>>>>>>> Stashed changes
  useEffect(() => {
    if (!projectId) return;
    fetchProject();
    fetchPhases();
    fetchMembers();
  }, [projectId]);

  async function fetchProject() {
    setLoadingProject(true);
    try {
      const res = await getProjectDetail(projectId);
      if (res?.status === 200 && res.data) {
        setProject(res.data);
        // luôn sync repoUrl theo server để tránh giữ giá trị cũ trên input
        setRepoUrl(res.data.repoLink ? String(res.data.repoLink).trim() : "");
      } else {
        setProject(null);
        setRepoUrl("");
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
      setProject(null);
      setRepoUrl("");
    } finally {
      setLoadingProject(false);
    }
  }

  async function fetchPhases() {
    setLoadingPhases(true);
    try {
      const res = await getPhasesWithTasksByProject(projectId);
      if (res?.status === 200 && Array.isArray(res.data)) {
        setPhases(res.data);
        if (res.data.length > 0) {
          const last = res.data.reduce((a, b) =>
            a.sequence > b.sequence ? a : b
          );
          setPreviousDeadline(
            dayjs(last.deadline).add(1, "day").format("YYYY-MM-DD")
          );
        } else {
          setPreviousDeadline(null);
        }
      } else {
        setPhases([]);
        setPreviousDeadline(null);
      }
    } catch (error) {
      console.error("Failed to fetch phases:", error);
      setPhases([]);
      setPreviousDeadline(null);
    } finally {
      setLoadingPhases(false);
    }
  }

  async function fetchMembers() {
    setLoadingMembers(true);
    try {
      const res = await getProjectEmployees(projectId);
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];
      setMembers(list);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const ok = await getGithubTokenStatus();
        setGithubConnected(!!ok);
      } catch {
        setGithubConnected(false);
      }
    })();

    const url = new URL(window.location.href);
    if (url.searchParams.get("github") === "connected") {
      const saved = sessionStorage.getItem("pendingRepoLink");
      const savedPid = sessionStorage.getItem("pendingRepoProjectId");

      (async () => {
        // ✅ xác thực lại trạng thái token thật sự từ server
        const actuallyConnected = await getGithubTokenStatus();

        if (actuallyConnected && saved && savedPid && Number(savedPid) === Number(projectId)) {
          const resp = await linkRepoToProject(projectId, { repoUrl: saved });
          if (resp?.status === 200) {
            dispatch(
              setPopup({
                type: "success",
                message: resp.message || "Link repo thành công",
              })
            );
            setRepoUrl(saved);
            setProject((p) => (p ? { ...p, repoLink: saved } : p));
            await fetchProject();
          } else {
            dispatch(
              setPopup({
                type: "error",
                message: resp?.message || "Link repo thất bại",
              })
            );
          }
<<<<<<< Updated upstream
          sessionStorage.removeItem("pendingRepoLink");
          sessionStorage.removeItem("pendingRepoProjectId");
        } else {
          dispatch(
            setPopup({ type: "success", message: "Đã kết nối GitHub!" })
          );
=======
        } else if (saved) {
          dispatch(setPopup({
            type: "error",
            message: "Kết nối GitHub thất bại hoặc bạn không có quyền. Hãy đăng nhập GitHub với tài khoản hợp lệ."
          }));
>>>>>>> Stashed changes
        }

<<<<<<< Updated upstream
      // clean url
      url.searchParams.delete("github");
      const clean =
        url.pathname +
        (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
      window.history.replaceState({}, "", clean);
=======
        sessionStorage.removeItem("pendingRepoLink");
        sessionStorage.removeItem("pendingRepoProjectId");

        url.searchParams.delete("github");
        const clean =
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
        window.history.replaceState({}, "", clean);
      })();
>>>>>>> Stashed changes
    }
  }, [dispatch, projectId]);

  const handleAccordionChange = (phaseId) => {
    setExpandedPhaseId(expandedPhaseId === phaseId ? null : phaseId);
  };

  const handleMenuClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleDeleteTask = (phaseId, taskId) => {
    setConfirmDelete({ open: true, phaseId, taskId });
  };

  function getNextPhaseStatus(phase) {
    if (!phase || !Array.isArray(phases)) return null;
    const next = phases.find((p) => p.sequence === phase.sequence + 1);
    return next?.status ?? null;
  }

  function getNextPhaseDeadline(phase) {
    if (!phase || !Array.isArray(phases)) return null;
    const next = phases.find((p) => p.sequence === phase.sequence + 1);
    return next?.deadline ?? null;
  }

  const getFilteredTasks = (tasks) => {
    if (!searchTerm.trim()) return tasks;
    return tasks.filter((task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getTaskStatusCounts = (tasks) => ({
    total: tasks.length,
    PLANNING: tasks.filter((task) => task.status === "PLANNING").length,
    IN_REVIEW: tasks.filter((task) => task.status === "IN_REVIEW").length,
    IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    COMPLETED: tasks.filter((task) => task.status === "COMPLETED").length,
    CANCELED: tasks.filter((task) => task.status === "CANCELED").length,
  });

  function canCreateTask(phase) {
    if (phase.sequence > 1) {
      const prev = phases.find((p) => p.sequence === phase.sequence - 1);
      if (prev && prev.status !== "COMPLETED") return false;
    }
    return true;
  }

  const openUpdatePhaseDialog = (phase) => {
    if (isViewOnly) return;
    // 🔒 Chỉ khóa khi phase hiện tại COMPLETED & phase sau IN_PROGRESS + có task
    if (isPhaseLockedForTaskEditing(phase, phases)) {
      dispatch(setPopup({ type: "warning", message: t("errors.phaseLockedEditing") }));
      return;
    }
    setEditingPhase(phase);
    setOpenUpdatePhase(true);
  };

  const getPrevDeadline = (phase) => {
    if (!phase || !Array.isArray(phases)) return null;
    const prev = phases.find((p) => p.sequence === phase.sequence - 1);
    return prev?.deadline ?? null;
  };

  const minAllowedDeadline = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return null;
    let max = null;
    for (const p of phases) {
      if (p?.deadline && (!max || dayjs(p.deadline).isAfter(max, "day"))) {
        max = dayjs(p.deadline, "YYYY-MM-DD");
      }
      if (Array.isArray(p?.tasks)) {
        for (const t of p.tasks) {
          if (t?.deadline && t.status !== "CANCELED" && (!max || dayjs(t.deadline, "YYYY-MM-DD").isAfter(max, "day"))) {
            max = dayjs(t.deadline, "YYYY-MM-DD");
          }
        }
      }
    }
    return max ? max.format("YYYY-MM-DD") : null;
  }, [phases]);

  const isProjectCanceled = project?.status === "CANCELED";
<<<<<<< Updated upstream
  const repoLinked = !!project?.repoLink;
  const isPM =
    !!project?.pmId && !!me?.id && Number(me.id) === Number(project.pmId);
=======

  const hasMembers = (members?.length ?? 0) > 0;
  const canCreatePhase = !isProjectCanceled && hasMembers && canEditProject;
>>>>>>> Stashed changes

  const isPhaseLockedForTaskEditing = (phase, phases) => {
    if (!phase || !Array.isArray(phases)) return false;
    if (phase.status !== "COMPLETED") return false;
    const next = phases.find((p) => p.sequence === phase.sequence + 1);
    const nextHasTasks = Array.isArray(next?.tasks) && next?.tasks?.length > 0;
    return !!next && next.status === "IN_PROGRESS" && nextHasTasks;
  };

  const handleOpenAddTask = (phase) => {
    if (isViewOnly) return;
    // 🔒 HARD-LOCK: Phase completed → cấm tạo task
    if (phase?.status === "COMPLETED") {
      dispatch(setPopup({ type: "warning", message: t("errors.phaseLockedEditing") }));
      return;
    }
    if (isProjectCanceled) {
      dispatch(setPopup({ type: "error", message: t("errors.projectCanceledCreateTask") }));
      return;
    }
    if (!hasMembers) {
      dispatch(setPopup({ type: "warning", message: t("errors.addMembersFirst") }));
      return;
    }
    if (!canCreateTask(phase)) {
      dispatch(setPopup({ type: "warning", message: t("errors.prevPhaseNotCompleted") }));
      return;
    }

    setCurrentPhaseForTask(phase);
    setOpenAddTask(true);
  };

  const connectGithub = async () => {
    try {
      // Chỉ PM mới có quyền link → dùng context "project"
      await startGithubLogin({
        context: "project",
        id: Number(projectId),
        redirect: window.location.href,
      });
    } catch (e) {
      dispatch(
        setPopup({
          type: "error",
          message: "Không khởi tạo được đăng nhập GitHub",
        })
      );
    }
  };

  const handleLinkRepo = async () => {
<<<<<<< Updated upstream
    if (!isPM) {
      dispatch(
        setPopup({
          type: "error",
          message: "Chỉ PM của dự án mới được phép link repo.",
        })
      );
=======
    if (!canLinkRepo) {
      dispatch(setPopup({ type: "error", message: "Chỉ PM được phép link repo." }));
>>>>>>> Stashed changes
      return;
    }

    const url = (repoUrl || "").trim();
    if (!url) {
      dispatch(
        setPopup({
          type: "error",
          message: "Vui lòng nhập URL repo (vd: https://github.com/owner/repo)",
        })
      );
      return;
    }
<<<<<<< Updated upstream
    if (!/^https:\/\/github\.com\/[^\/]+\/[^\/]+/i.test(url)) {
      dispatch(
        setPopup({ type: "error", message: "Định dạng repo URL không hợp lệ" })
      );
=======
    if (!/^https:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/?$/i.test(url)) {
      dispatch(setPopup({ type: "error", message: "Định dạng repo URL không hợp lệ" }));
>>>>>>> Stashed changes
      return;
    }

    if (!githubConnected) {
      sessionStorage.setItem("pendingRepoLink", url);
      sessionStorage.setItem("pendingRepoProjectId", String(projectId));
      await connectGithub();
      return;
    }

    const resp = await linkRepoToProject(projectId, { repoUrl: url });
    if (resp?.status === 200) {
      dispatch(
        setPopup({
          type: "success",
          message: resp.message || "Link repo thành công",
        })
      );
      setProject((p) => (p ? { ...p, repoLink: url } : p));
      setRepoUrl(url);
      await fetchProject();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: resp?.message || "Link repo thất bại",
        })
      );
    }
  };

<<<<<<< Updated upstream
  // Early returns
  if (loadingProject)
    return <Typography>Loading project details...</Typography>;
  if (!project) return <Typography>Không tìm thấy dự án.</Typography>;
=======
  if (loadingProject) return <Typography>{t("loadingProject")}</Typography>;
  if (!project) return <Typography>{t("projectNotFound")}</Typography>;
>>>>>>> Stashed changes

  const overdue = isOverdue(project.deadline);
  const daysLeft = calculateDaysRemaining(project.deadline);
  const daysLate = getDaysOverdue(project.deadline);

  const handleQuickTask = async () => {
    if (isProjectCanceled) {
      dispatch(
        setPopup({
          type: "error",
          message: "Project đã bị hủy. Không thể tạo task.",
        })
      );
      return;
    }
    const name = window.prompt("Tên task (bỏ trống để dùng mặc định):", "");

    try {
      setQuicking(true);
      const res = await createQuickTask(projectId, name?.trim() || undefined);
      setQuicking(false);

      if (res?.status === 201 && res?.data) {
        dispatch(setPopup({ type: "success", message: "Đã tạo quick task!" }));
        if (res.data.phaseId) setExpandedPhaseId(res.data.phaseId);
        await fetchPhases();
      } else {
        dispatch(
          setPopup({
            type: "error",
            message: res?.message || "Tạo quick task thất bại",
          })
        );
      }
    } catch (e) {
      setQuicking(false);
      dispatch(
        setPopup({ type: "error", message: "Server lỗi khi tạo quick task" })
      );
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #F8FAFC 0%, #E0F2FE 25%, #F0FDF4 50%, #FFFBEB 75%, #FEF2F2 100%)",
        position: "relative",
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", py: 3 }}>
        <Button
          component={RouterLink}
          to="/management/projects"
          startIcon={<ArrowBack />}
          sx={{ mb: 1, textTransform: "none", fontWeight: 600 }}
        >
          {t("backToProjects")}
        </Button>

        <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mb: 3 }}>
          <Paper sx={{ p: 2, background: "linear-gradient(135deg, #118D57 0%, #10B981 100%)", borderRadius: 4, boxShadow: "0 8px 24px rgba(17, 141, 87, 0.3)" }}>
            <Assignment sx={{ color: "white", fontSize: 28 }} />
          </Paper>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ background: "linear-gradient(135deg, #1F2937 0%, #4B5563 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>
              {t("projectDetailTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {t("projectDetailSubtitle")}
            </Typography>
          </Box>
        </Stack>

        <Card sx={{ borderRadius: 3, backgroundColor: "white", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)", mb: 4 }}>
          <CardContent>
            {/* Header: Tên dự án + actions */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={project.name}
                >
                  {project.name}
                </Typography>
                {/* ↓ Description: wrap xuống dòng, không ellipsis, không tràn ngang */}
                {project?.description?.trim() ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.75,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      maxWidth: "100%",
                    }}
                    title={project.description}
                  >
                    {project.description}
                  </Typography>
                ) : null}
              </Box>

              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
                {/* ✅ Chỉ hiện "Mở GitHub" khi đã có repo hợp lệ (mọi role đều thấy) */}
                {hasValidRepo ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNew />}
                    href={(project.repoLink || "").trim()}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {t("githubOpen")}
                  </Button>
                ) : (
                  // ❗Không có repo → chỉ PM mới thấy UI link repo
                  canLinkRepo && (
                    <>
                      <TextField
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo"
                        size="small"
                        sx={{ width: { xs: 220, sm: 300, md: 360 } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <GitHub fontSize="small" />
                            </InputAdornment>
                          ),
                          readOnly: false,
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<LinkIcon />}
                        onClick={handleLinkRepo}
                        disabled={isProjectCanceled}
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        {t("linkRepo")}
                      </Button>
                    </>
                  )
                )}

                {/* More menu: ẨN hoàn toàn với EMP/HOD */}
                {!isStaff && (
                  <IconButton onClick={handleMenuClick} aria-label="project menu">
                    <MoreVert />
                  </IconButton>
                )}
              </Stack>
            </Box>

<<<<<<< Updated upstream
            {/* Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {/* Chỉ PM mới thấy Connect GitHub */}
              {isPM && !githubConnected ? (
=======
            {/* MENU (ẩn hoàn toàn với EMP/HOD) */}
            {!isStaff && (
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                {/* ✅ Chỉ PM mới thấy “Connect GitHub” */}
                {canLinkRepo && !githubConnected ? (
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      connectGithub();
                    }}
                    disabled={isProjectCanceled}
                  >
                    <ListItemIcon><GitHub fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t("connectGithub")} />
                  </MenuItem>
                ) : canLinkRepo && githubConnected ? (
                  <MenuItem disabled>
                    <ListItemIcon><GitHub fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t("githubConnectedMenu")} />
                  </MenuItem>
                ) : null}

                {canEditProject ? (
                  <MenuItem
                    onClick={() => {
                      setOpenEditForm(true);
                      handleMenuClose();
                    }}
                  >
                    <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t("editProject")} />
                  </MenuItem>
                ) : (
                  <MenuItem disabled>
                    <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t("viewProject")} />
                  </MenuItem>
                )}

                {/* 👇 NEW: Add Members for ADMIN/MANAGER/PM */}
                {canEditProject && (
                  <MenuItem
                    onClick={() => {
                      setOpenAddMembers(true);
                      handleMenuClose();
                    }}
                    disabled={isProjectCanceled}
                  >
                    <ListItemIcon><PersonAdd fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t("addMember")} />
                  </MenuItem>
                )}

>>>>>>> Stashed changes
                <MenuItem
                  onClick={() => {
                    setOpenViewMembers(true);
                    handleMenuClose();
                  }}
                >
                  <ListItemIcon><Group fontSize="small" /></ListItemIcon>
                  <ListItemText primary={t("viewMembers")} />
                </MenuItem>

                {canEditProject && (
                  <MenuItem
                    onClick={() => {
                      if (!canCreatePhase) {
                        dispatch(setPopup({ type: "warning", message: canEditProject ? t("errors.addMembersFirst") : t("errors.noPermissionCreatePhase") }));
                        handleMenuClose();
                        return;
                      }
                      setOpenCreatePhase(true);
                      handleMenuClose();
                    }}
                    disabled={!canCreatePhase}
                  >
                    <ListItemIcon><Add fontSize="small" /></ListItemIcon>
                    <ListItemText primary={t("createPhase")} />
                  </MenuItem>
                )}
              </Menu>
            )}

<<<<<<< Updated upstream
              <MenuItem
                onClick={() => {
                  setOpenViewMembers(true);
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Group fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="View Members" />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  if (isProjectCanceled) return;
                  setOpenAddMembers(true);
                  handleMenuClose();
                }}
                disabled={isProjectCanceled}
              >
                <ListItemIcon>
                  <PersonAdd fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Add Member" />
              </MenuItem>

              <MenuItem
                onClick={() => {
                  if (isProjectCanceled) return;
                  setOpenCreatePhase(true);
                  handleMenuClose();
                }}
                disabled={isProjectCanceled}
              >
                <ListItemIcon>
                  <Add fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Create Phase" />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  if (!isProjectCanceled) setOpenQuickAssign(true);
                }}
                disabled={isProjectCanceled}
              >
                <ListItemIcon>
                  <Bolt fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Quick Task" />
              </MenuItem>
            </Menu>

            {/* Chips */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              mb={2}
            >
=======
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={2}>
>>>>>>> Stashed changes
              <Chip
                icon={<Schedule sx={{ fontSize: 16 }} />}
                label={statusLabel(project.status, "project")}
                size="small"
                color={statusColor(project.status)}
              />
<<<<<<< Updated upstream
              {project.documentCode && (
                <Chip
                  label={project.documentCode}
                  size="small"
                  variant="outlined"
                />
              )}
              {project.pmName && (
                <Chip
                  label={`PM: ${project.pmName}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {githubConnected && isPM && (
                <Chip
                  icon={<GitHub sx={{ fontSize: 16 }} />}
                  label="GitHub Connected"
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
            </Stack>

            {/* Timeline */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                px: 1,
                py: 1.2,
                backgroundColor: "#F9FAFB",
                borderRadius: 2,
              }}
            >
=======
              {project.documentCode && <Chip label={project.documentCode} size="small" variant="outlined" />}
              {project.pmName && <Chip label={`PM: ${project.pmName}`} size="small" variant="outlined" />}
              {githubConnected && canLinkRepo && (
                <Chip icon={<GitHub sx={{ fontSize: 16 }} />} label={t("githubConnected")} size="small" variant="outlined" />
              )}
              {(isViewOnly || isStaff) && (
                <Chip icon={<Lock sx={{ fontSize: 16 }} />} label={t("viewOnly")} size="small" variant="outlined" />
              )}
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, py: 1.2, backgroundColor: "#F9FAFB", borderRadius: 2 }}>
>>>>>>> Stashed changes
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    backgroundColor: "#3B82F6",
                    color: "white",
                    p: 1,
                    borderRadius: 2,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {`${formatDate(project.createdAt)} - ${formatDate(
                      project.deadline
                    )}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{t("projectTimeline")}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ backgroundColor: "#10B981", color: "white", p: 1, borderRadius: 2 }}>
                  <AccessTime sx={{ fontSize: 18 }} />
                </Box>
                <Box>
<<<<<<< Updated upstream
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ color: overdue ? "error.main" : "success.main" }}
                  >
                    {overdue
                      ? `${daysLate} days overdue`
                      : `${daysLeft} days left`}
=======
                  <Typography variant="subtitle2" fontWeight={600} sx={{ color: overdue ? "error.main" : "success.main" }}>
                    {overdue
                      ? t("daysOverdue", { count: daysLate })
                      : t("daysLeft", { count: daysLeft })}
>>>>>>> Stashed changes
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {overdue ? t("overdue") : t("remaining")}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

<<<<<<< Updated upstream
        {/* Phases Section */}
        <Paper
          elevation={2}
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            backgroundColor: "#ffffff",
            mb: 4,
          }}
        >
          {/* Header + Search */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Paper
                sx={{
                  p: 1.5,
                  background:
                    "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  borderRadius: 3,
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
              >
                <TrendingUp sx={{ color: "white", fontSize: 24 }} />
              </Paper>
              <Typography
                variant="h6"
                sx={{
                  background:
                    "linear-gradient(135deg, #1F2937 0%, #4B5563 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 600,
                }}
              >
                Phase Management
=======
        {/* PHASES */}
        <Paper elevation={2} sx={{ px: 3, py: 2, borderRadius: 3, backgroundColor: "#ffffff", mb: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Paper sx={{ p: 1.5, background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", borderRadius: 3, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}>
                <TrendingUp sx={{ color: "white", fontSize: 24 }} />
              </Paper>
              <Typography variant="h6" sx={{ background: "linear-gradient(135deg, #1F2937 0%, #4B5563 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 600 }}>
                {t("phaseManagement")}
>>>>>>> Stashed changes
              </Typography>
            </Stack>

            <TextField
              placeholder={t("searchTasksPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
              size="small"
            />
          </Stack>

          <Stack spacing={2}>
            {loadingPhases ? (
              <CircularProgress />
            ) : phases.length === 0 ? (
              <Typography>{t("noPhasesYet")}</Typography>
            ) : (
              phases.map((phase) => {
                const filteredTasks = getFilteredTasks(phase.tasks || []);
                const taskCounts = getTaskStatusCounts(filteredTasks);
                const showEditPhase = canEditProject && !isProjectCanceled;
                // ✅ chỉ khóa khi phase hiện tại COMPLETED & phase sau IN_PROGRESS + có task
                const allowEditPhase = showEditPhase && !isPhaseLockedForTaskEditing(phase, phases);

                return (
                  <Accordion
                    key={phase.id}
                    expanded={expandedPhaseId === phase.id}
                    onChange={() => handleAccordionChange(phase.id)}
                    sx={{
                      borderRadius: 3,
                      backgroundColor: "white",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
                      "&:before": { display: "none" },
                      "&.Mui-expanded": { margin: "8px 0" },
                    }}
                  >
                    <AccordionSummary
<<<<<<< Updated upstream
                      component="div"
                      expandIcon={<ExpandMore />}
                    >
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        width="100%"
                      >
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography
                            component={RouterLink}
                            to={`/projects/${projectId}/phase/${phase.id}/kanban`}
                            fontWeight={600}
                            sx={{
                              textDecoration: "none",
                              color: "inherit",
                              "&:hover": { textDecoration: "underline" },
                              fontSize: 20,
                            }}
                          >
                            {phase.displayName ||
                              `Phase ${phase.sequence}: ${phase.name}`}
                          </Typography>
                        </Box>
=======
                    component="div"
                      expandIcon={<ExpandMore />}
                      sx={{
                        "& .MuiAccordionSummary-content": {
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mr: 1,
                        },
                      }}
                    >
                      {/* LEFT: Phase title (ellipsis) */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          component={RouterLink}
                          to={`/projects/${projectId}/phase/${phase.id}/kanban`}
                          fontWeight={600}
                          noWrap
                          sx={{
                            textDecoration: "none",
                            color: "inherit",
                            "&:hover": { textDecoration: "underline" },
                            fontSize: 20,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                            maxWidth: "100%",
                          }}
                          title={phase.displayName || `Phase ${phase.sequence}: ${phase.name}`}
                        >
                          {phase.displayName || `Phase ${phase.sequence}: ${phase.name}`}
                        </Typography>
                      </Box>
>>>>>>> Stashed changes

                      {/* RIGHT: Status + edit */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ml: 2 }}>
                        <Chip label={statusLabel(phase.status, "phase")} color={statusColor(phase.status)} size="small" />
                        {allowEditPhase ? (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUpdatePhaseDialog(phase);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        ) : (
                          <Tooltip title={t("viewOnly")}>
                            <span>
                              <IconButton size="small" disabled>
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Stack>
                    </AccordionSummary>

                    <AccordionDetails sx={{ pt: 0 }}>
                      <Stack spacing={3}>
                        {/* Phase info */}
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{
                            px: 1,
                            py: 1.2,
                            backgroundColor: "#F9FAFB",
                            borderRadius: 2,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                backgroundColor: "#3B82F6",
                                color: "white",
                                p: 1,
                                borderRadius: 2,
                              }}
                            >
                              <CalendarToday sx={{ fontSize: 18 }} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {t("deadlineLabel")}: {phase.deadline}
                              </Typography>
<<<<<<< Updated upstream
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Add />}
                                onClick={() => handleOpenAddTask(phase)}
                                disabled={
                                  isProjectCanceled || !canCreateTask(phase)
                                }
                                sx={{ textTransform: "capitalize" }}
=======
                              <Tooltip
                                title={
                                  (isViewOnly || isStaff || phase.status === "COMPLETED")
                                    ? t("viewOnly")
                                    : ""
                                }
>>>>>>> Stashed changes
                              >
                                <span>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={() => handleOpenAddTask(phase)}
                                    // 🔒 staff & view-only & COMPLETED không tạo task
                                    disabled={
                                      isProjectCanceled ||
                                      !canCreateTask(phase) ||
                                      !hasMembers ||
                                      isViewOnly ||
                                      isStaff ||
                                      phase.status === "COMPLETED"
                                    }
                                    sx={{ textTransform: "capitalize" }}
                                  >
                                    {t("createTask")}
                                  </Button>
                                </span>
                              </Tooltip>
                            </Box>
                          </Stack>

                          {phase.status !== "PLANNING" && (
                            <Box sx={{ minWidth: 120 }}>
<<<<<<< Updated upstream
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                mb={0.5}
                              >
                                <Typography variant="body2" fontWeight={600}>
                                  Progress
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="primary.main"
                                  fontWeight={600}
                                >
                                  {phase.progress ?? 0}%
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={
                                  typeof phase.progress === "number"
                                    ? phase.progress
                                    : 0
                                }
                                sx={{ height: 8, borderRadius: 5 }}
                              />
=======
                              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Typography variant="body2" fontWeight={600}>{t("progress")}</Typography>
                                <Typography variant="body2" color="primary.main" fontWeight={600}>
                                  {phase.progress ?? 0}%
                                </Typography>
                              </Stack>
                              <LinearProgress variant="determinate" value={typeof phase.progress === "number" ? phase.progress : 0} sx={{ height: 8, borderRadius: 5 }} />
>>>>>>> Stashed changes
                            </Box>
                          )}
                        </Stack>

                        {/* Tasks */}
                        <Box>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            mb={2}
                          >
                            <Typography variant="subtitle1" fontWeight={600}>
                              {t("tasksHeading")} ({taskCounts.total})
                            </Typography>
                            {taskCounts.total > 0 && (
                              <>
<<<<<<< Updated upstream
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  -
                                </Typography>
                                <Chip
                                  label={`${formatStatus("PLANNING")} (${
                                    taskCounts["PLANNING"]
                                  })`}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                                <Chip
                                  label={`${formatStatus("IN_PROGRESS")} (${
                                    taskCounts["IN_PROGRESS"]
                                  })`}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                                <Chip
                                  label={`${formatStatus("COMPLETED")} (${
                                    taskCounts["COMPLETED"]
                                  })`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
=======
                                <Typography variant="body2" color="text.secondary">-</Typography>
                                <Chip label={`${statusLabel("PLANNING", "task")} (${taskCounts["PLANNING"]})`} size="small" color="warning" variant="outlined" sx={{ fontSize: "0.75rem" }} />

                                <Chip label={`${statusLabel("IN_PROGRESS", "task")} (${taskCounts["IN_PROGRESS"]})`} size="small" color="info" variant="outlined" sx={{ fontSize: "0.75rem" }} />
                                <Chip label={`${statusLabel("IN_REVIEW", "task")} (${taskCounts["IN_REVIEW"]})`} size="small" color="secondary" variant="outlined" sx={{ fontSize: "0.75rem" }} />
                                <Chip label={`${statusLabel("COMPLETED", "task")} (${taskCounts["COMPLETED"]})`} size="small" color="success" variant="outlined" sx={{ fontSize: "0.75rem" }} />
>>>>>>> Stashed changes
                              </>
                            )}
                          </Stack>

                          <Box
                            sx={{
                              maxHeight: 300,
                              overflowY: "auto",
                              "&::-webkit-scrollbar": { width: 6 },
                              "&::-webkit-scrollbar-track": {
                                bgcolor: "#f1f1f1",
                                borderRadius: 3,
                              },
                              "&::-webkit-scrollbar-thumb": {
                                bgcolor: "#c1c1c1",
                                borderRadius: 3,
                              },
                            }}
                          >
                            {filteredTasks.length === 0 ? (
<<<<<<< Updated upstream
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 3,
                                  textAlign: "center",
                                  borderStyle: "dashed",
                                  bgcolor: "#fafafa",
                                  borderRadius: 2,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {searchTerm.trim()
                                    ? "Không tìm thấy task nào phù hợp."
                                    : "Chưa có task nào. Hãy thêm task đầu tiên!"}
=======
                              <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderStyle: "dashed", bgcolor: "#fafafa", borderRadius: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {searchTerm.trim() ? t("noTasksFound") : t("noTasksYet")}
>>>>>>> Stashed changes
                                </Typography>
                              </Paper>
                            ) : (
                              <Stack spacing={1}>
<<<<<<< Updated upstream
                                {filteredTasks.map((task) => (
                                  <Card
                                    key={task.id}
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      minHeight: TASK_CARD_HEIGHT,
                                      display: "flex",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      "&:hover": {
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                      },
                                      ...(isPhaseLockedForTaskEditing(
                                        phase,
                                        phases
                                      ) && {
                                        opacity: 0.6,
                                        cursor: "not-allowed",
                                        "&:hover": { boxShadow: "none" },
                                      }),
                                    }}
                                    onClick={() => {
                                      if (
                                        isPhaseLockedForTaskEditing(
                                          phase,
                                          phases
                                        )
                                      ) {
                                        alert(
                                          "❌ Phase sau đang In progress và đã có task. Không thể chỉnh sửa task trong phase đã Completed."
                                        );
                                        return;
                                      }
                                      setEditingTask(task);
                                      setCurrentPhaseForTask(phase);
                                      setOpenUpdateTask(true);
                                    }}
                                  >
                                    <CardContent
=======
                                {filteredTasks.map((task) => {
                                  // 🔒 chỉ khóa khi phase hiện tại COMPLETED & phase sau IN_PROGRESS + có task
                                  const isLocked = isPhaseLockedForTaskEditing(phase, phases);
                                  // 🔒 EMP/HOD & view-only không được click mở UpdateTask
                                  const clickable = !isLocked && canEditProject && !isStaff;

                                  return (
                                    <Card
                                      key={task.id}
                                      variant="outlined"
>>>>>>> Stashed changes
                                      sx={{
                                        borderRadius: 2,
                                        minHeight: TASK_CARD_HEIGHT,
                                        display: "flex",
                                        alignItems: "center",
                                        cursor: clickable ? "pointer" : "not-allowed",
                                        "&:hover": { boxShadow: clickable ? "0 4px 12px rgba(0,0,0,0.1)" : "none" },
                                        ...(isLocked || isStaff || isViewOnly ? {
                                          opacity: 0.6,
                                          "&:hover": { boxShadow: "none" },
                                        } : {}),
                                      }}
                                      onClick={() => {
                                        if (!clickable) {
                                          // Thông báo khi cố sửa task thuộc phase đã bị khóa chuỗi
                                          dispatch(setPopup({ type: "warning", message: t("errors.phaseLockedEditing") }));
                                          return;
                                        }
                                        setEditingTask(task);
                                        setCurrentPhaseForTask(phase);
                                        setOpenUpdateTask(true);
                                      }}
                                    >
<<<<<<< Updated upstream
                                      <Stack
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                      >
                                        {/* Task name (ellipsis) */}
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          gap={1.25}
                                          flex={1}
                                          minWidth={0}
                                        >
                                          {getStatusIcon(task.status)}
                                          <Typography
                                            fontWeight={600}
                                            noWrap
                                            sx={{
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={task.name}
                                          >
                                            {task.name}
                                          </Typography>
                                        </Box>

                                        {/* Assignee */}
                                        {task.assigneeId && (
                                          <Box sx={{ minWidth: 140 }}>
                                            <Stack sx={{ minWidth: 0 }}>
                                              <Typography
                                                variant="caption"
                                                noWrap
                                                fontWeight={600}
                                              >
                                                {task.assigneeName ||
                                                  "(No name)"}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                noWrap
                                              >
                                                {task.assigneeUsername
                                                  ? `@${task.assigneeUsername}`
                                                  : ""}
                                              </Typography>
                                            </Stack>
=======
                                      <CardContent sx={{ p: 1.5, py: 1, width: "100%", "&:last-child": { pb: 1 } }}>
                                        <Box
                                          sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", sm: "1fr 150px 120px 110px 90px" },
                                            columnGap: 2,
                                            rowGap: 0.5,
                                            alignItems: "center",
                                          }}
                                        >
                                          {/* Tên task (co giãn) */}
                                          <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                              fontWeight={600}
                                              noWrap
                                              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                              title={task.name}
                                            >
                                              {task.name}
                                            </Typography>
>>>>>>> Stashed changes
                                          </Box>

<<<<<<< Updated upstream
                                        {/* Status */}
                                        <Chip
                                          label={formatStatus(task.status)}
                                          size="small"
                                          color={getStatusColor(task.status)}
                                          sx={{
                                            minWidth: 80,
                                            "& .MuiChip-label": {
                                              fontWeight: 500,
                                            },
                                            whiteSpace: "nowrap",
                                          }}
                                        />

                                        {/* Size */}
                                        {task.size && (
                                          <Chip
                                            label={`Size: ${task.size}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                              minWidth: 70,
                                              fontWeight: 600,
                                              whiteSpace: "nowrap",
                                            }}
                                          />
                                        )}

                                        {/* Deadline */}
                                        {task.deadline && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                            sx={{
                                              minWidth: 88,
                                              textAlign: "center",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={task.deadline}
                                          >
                                            {task.deadline}
                                          </Typography>
                                        )}
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                ))}
=======
                                          {/* Assignee */}
                                          <Box sx={{ minWidth: 0 }}>
                                            {task.assigneeId ? (
                                              <Stack sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" noWrap fontWeight={600}>
                                                  {task.assigneeName || t("noName")}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                  {task.assigneeUsername ? `@${task.assigneeUsername}` : ""}
                                                </Typography>
                                              </Stack>
                                            ) : (
                                              <Typography variant="caption" color="text.secondary" noWrap>
                                                —
                                              </Typography>
                                            )}
                                          </Box>

                                          {/* Status */}
                                          <Box>
                                            <Chip
                                              label={statusLabel(task.status, "task")}
                                              size="small"
                                              color={statusColor(task.status)}
                                              sx={{
                                                width: 120,
                                                justifyContent: "center",
                                                "& .MuiChip-label": { fontWeight: 500, px: 1, whiteSpace: "nowrap" },
                                              }}
                                            />
                                          </Box>

                                          {/* Size */}
                                          <Box>
                                            {task.size ? (
                                              <Chip
                                                label={t("sizeLabel", { value: task.size })}
                                                size="small"
                                                variant="outlined"
                                                sx={{ width: 110, fontWeight: 600, whiteSpace: "nowrap" }}
                                              />
                                            ) : (
                                              <Box sx={{ width: 110, height: 24 }} />
                                            )}
                                          </Box>

                                          {/* Deadline */}
                                          <Box sx={{ textAlign: "center" }}>
                                            {task.deadline ? (
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                noWrap
                                                sx={{ display: "block" }}
                                                title={task.deadline}
                                              >
                                                {task.deadline}
                                              </Typography>
                                            ) : (
                                              <Box sx={{ height: 20 }} />
                                            )}
                                          </Box>
                                        </Box>
                                      </CardContent>

                                    </Card>
                                  );
                                })}
>>>>>>> Stashed changes
                              </Stack>
                            )}
                          </Box>
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })
            )}
          </Stack>
        </Paper>

        {/* Create Task */}
        <CreateTaskDialog
          open={openAddTask && canEditProject && !isStaff && currentPhaseForTask?.status !== "COMPLETED"} // 🔒 safety
          onClose={() => setOpenAddTask(false)}
          phase={currentPhaseForTask}
          projectId={projectId}
          projectStatus={project?.status}
          onCreated={async () => {
            await fetchPhases();
            await fetchProject();
          }}
        />

        {/* Create Phase */}
        <CreatePhaseDialog
          open={openCreatePhase && !isProjectCanceled && hasMembers && canEditProject}
          onClose={() => setOpenCreatePhase(false)}
          projectDeadline={project.deadline}
          previousDeadline={previousDeadline}
          projectId={projectId}
          onCreated={async () => {
            await fetchPhases();
          }}
        />

        {/* Confirm delete */}
        <Dialog
          open={confirmDelete.open}
          onClose={() =>
            setConfirmDelete({ open: false, phaseId: null, taskId: null })
          }
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>{t("confirmDeleteTitle")}</DialogTitle>
          <DialogContent>
<<<<<<< Updated upstream
            <Typography>
              Bạn có chắc chắn muốn xóa task này không? Hành động này không thể
              hoàn tác.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={() =>
                setConfirmDelete({ open: false, phaseId: null, taskId: null })
              }
            >
              Hủy
=======
            <Typography>{t("confirmDeleteBody")}</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button onClick={() => setConfirmDelete({ open: false, phaseId: null, taskId: null })}>
              {t("cancel")}
>>>>>>> Stashed changes
            </Button>
            <Button
              variant="contained"
              color="error"
<<<<<<< Updated upstream
              onClick={() => alert("Chức năng xóa task tạm khóa.")}
            >
              Xóa Task
=======
              onClick={() =>
                dispatch(
                  setPopup({
                    type: "info",
                    message: t("featureDisabled", { defaultValue: "Feature disabled" }),
                  })
                )
              }
              disabled={isViewOnly || isStaff}
            >
              {t("deleteTask")}
>>>>>>> Stashed changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* View members */}
        <EmployeeProject
          open={openViewMembers}
          onClose={() => setOpenViewMembers(false)}
          projectId={projectId}
          onRemoved={() => {
            fetchMembers();
          }}
        />

        {/* Add Member */}
        <EmployeeProjectAdd
          open={openAddMembers && !isProjectCanceled && canEditProject}
          onClose={() => setOpenAddMembers(false)}
          projectId={projectId}
          projectCanceled={isProjectCanceled}
          onAdded={() => {
            fetchMembers();
          }}
        />

        {/* Edit Project */}
        <ProjectForm
          open={openEditForm && canEditProject}
          onClose={() => setOpenEditForm(false)}
          initialData={project}
          minAllowedDeadline={minAllowedDeadline}
          onSuccess={async () => {
            setOpenEditForm(false);
            await fetchProject();
            await fetchPhases();
          }}
        />

        {/* Update Phase */}
        <UpdatePhaseDialog
          open={openUpdatePhase && !isProjectCanceled && canEditProject}
          onClose={() => setOpenUpdatePhase(false)}
          phase={editingPhase}
          hasTasks={(editingPhase?.tasks?.length || 0) > 0}
          projectDeadline={project?.deadline}
          previousDeadline={editingPhase ? getPrevDeadline(editingPhase) : null}
<<<<<<< Updated upstream
          nextPhaseStatus={
            editingPhase ? getNextPhaseStatus(editingPhase) : null
          }
=======
          nextPhaseStatus={editingPhase ? getNextPhaseStatus(editingPhase) : null}
          nextPhaseDeadline={editingPhase ? getNextPhaseDeadline(editingPhase) : null}
>>>>>>> Stashed changes
          onUpdated={async () => {
            await fetchPhases();
          }}
        />

        {/* Update Task */}
        <UpdateTaskDialog
          open={openUpdateTask && canEditProject && !isStaff} // 🔒 staff không mở dialog
          onClose={() => setOpenUpdateTask(false)}
          task={editingTask}
          projectId={projectId}
          phaseDeadline={currentPhaseForTask?.deadline}
          projectDeadline={project?.deadline}
          onUpdated={async () => {
            await fetchPhases();
          }}
        />

        <QuickTaskAssignDrawer
          open={openQuickAssign}
          onClose={() => setOpenQuickAssign(false)}
          project={{ id: Number(projectId), ...project }}
          onDone={async (createdList) => {
            if (Array.isArray(createdList) && createdList[0]?.phaseId) {
              setExpandedPhaseId(createdList[0].phaseId);
            }
            await fetchPhases();
            await fetchProject();
          }}
        />
      </Container>
    </Box>
  );
}
