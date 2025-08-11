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
} from "@mui/material";
import {
  ExpandMore,
  Delete,
  Done,
  HourglassTop,
  PendingActions,
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
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { getProjectDetail, linkRepoToProject } from "~/services/project.service";
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

import { setPopup } from "~/libs/features/popup/popupSlice";
import { startGithubLogin, getGithubTokenStatus } from "~/services/github.service";

const TASK_CARD_HEIGHT = 72;

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const dispatch = useDispatch();

  // 👤 Lấy user hiện tại từ Redux (đổi selector nếu app của bạn khác)
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

  const [confirmDelete, setConfirmDelete] = useState({ open: false, phaseId: null, taskId: null });

  const [searchTerm, setSearchTerm] = useState("");

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openViewMembers, setOpenViewMembers] = useState(false);

  const [openAddMembers, setOpenAddMembers] = useState(false);

  const [openEditForm, setOpenEditForm] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // 🔐 GitHub connect status
  const [githubConnected, setGithubConnected] = useState(false);

  // 🔗 Repo URL input
  const [repoUrl, setRepoUrl] = useState("");

  // ======= Fetch data =======
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
        if (res.data.repoLink) setRepoUrl(res.data.repoLink);
      } else {
        setProject(null);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
      setProject(null);
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
          const last = res.data.reduce((a, b) => (a.sequence > b.sequence ? a : b));
          setPreviousDeadline(dayjs(last.deadline).add(1, "day").format("YYYY-MM-DD"));
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
      if (Array.isArray(res?.data)) setMembers(res.data);
      else setMembers([]);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  // 🔐 Check token + handle ?github=connected after callback
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
      setGithubConnected(true);

      const saved = sessionStorage.getItem("pendingRepoLink");
      const savedPid = sessionStorage.getItem("pendingRepoProjectId");

      const tryLinkRepo = async () => {
        if (saved && savedPid && Number(savedPid) === Number(projectId)) {
          const resp = await linkRepoToProject(projectId, { repoUrl: saved });
          if (resp?.status === 200) {
            dispatch(setPopup({ type: "success", message: resp.message || "Link repo thành công" }));
            setRepoUrl(saved);
            // cập nhật local để ẩn nút Link Repo
            setProject((p) => (p ? { ...p, repoLink: saved } : p));
            await fetchProject();
          } else {
            dispatch(setPopup({ type: "error", message: resp?.message || "Link repo thất bại" }));
          }
          sessionStorage.removeItem("pendingRepoLink");
          sessionStorage.removeItem("pendingRepoProjectId");
        } else {
          dispatch(setPopup({ type: "success", message: "Đã kết nối GitHub!" }));
        }
      };
      tryLinkRepo();

      // clean url
      url.searchParams.delete("github");
      const clean =
        url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
      window.history.replaceState({}, "", clean);
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

  const getFilteredTasks = (tasks) => {
    if (!searchTerm.trim()) return tasks;
    return tasks.filter((task) => task.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PLANNING":
        return <PendingActions sx={{ fontSize: 18, color: "#F59E0B" }} />;
      case "IN_PROGRESS":
        return <HourglassTop sx={{ fontSize: 18, color: "#3B82F6" }} />;
      case "COMPLETED":
        return <Done sx={{ fontSize: 18, color: "#10B981" }} />;
      case "CANCELED":
        return <Delete sx={{ fontSize: 18, color: "#EF4444" }} />;
      default:
        return null;
    }
  };

  const getTaskStatusCounts = (tasks) => ({
    total: tasks.length,
    PLANNING: tasks.filter((task) => task.status === "PLANNING").length,
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
    setEditingPhase(phase);
    setOpenUpdatePhase(true);
  };

  const getPrevDeadline = (phase) => {
    if (!phase || !Array.isArray(phases)) return null;
    const prev = phases.find((p) => p.sequence === phase.sequence - 1);
    return prev?.deadline ?? null;
  };

  // ⬇️ Hooks luôn trước early return
  const minAllowedDeadline = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return null;
    let max = null;
    for (const p of phases) {
      if (p?.deadline && (!max || dayjs(p.deadline).isAfter(max, "day"))) {
        max = dayjs(p.deadline, "YYYY-MM-DD");
      }
      if (Array.isArray(p?.tasks)) {
        for (const t of p.tasks) {
          if (
            t?.deadline &&
            t.status !== "CANCELED" &&
            (!max || dayjs(t.deadline, "YYYY-MM-DD").isAfter(max, "day"))
          ) {
            max = dayjs(t.deadline, "YYYY-MM-DD");
          }
        }
      }
    }
    return max ? max.format("YYYY-MM-DD") : null;
  }, [phases]);
  // ⬆️

  const isProjectCanceled = project?.status === "CANCELED";
  const repoLinked = !!project?.repoLink;
  const isPM = !!project?.pmId && !!me?.id && Number(me.id) === Number(project.pmId);

  const isPhaseLockedForTaskEditing = (phase, phases) => {
    if (!phase || !Array.isArray(phases)) return false;
    if (phase.status !== "COMPLETED") return false;
    const next = phases.find((p) => p.sequence === phase.sequence + 1);
    const nextHasTasks = Array.isArray(next?.tasks) && next?.tasks?.length > 0;
    return !!next && next.status === "IN_PROGRESS" && nextHasTasks;
  };

  const handleOpenAddTask = (phase) => {
    if (isProjectCanceled) {
      alert("❌ Project đã bị hủy. Không thể tạo task mới.");
      return;
    }
    if (!canCreateTask(phase)) {
      alert("❌ Không thể tạo task: Phase trước chưa hoàn thành");
      return;
    }
    setCurrentPhaseForTask(phase);
    setOpenAddTask(true);
  };

  // 🔐 Connect GitHub now (chỉ PM cần đến cho việc link repo)
  const connectGithub = async () => {
    try {
      await startGithubLogin({
        context: "project",
        id: Number(projectId),
        redirect: window.location.href,
      });
    } catch (e) {
      dispatch(setPopup({ type: "error", message: "Không khởi tạo được đăng nhập GitHub" }));
    }
  };

  // 🔗 Link repo (chỉ PM)
  const handleLinkRepo = async () => {
    if (!isPM) {
      dispatch(setPopup({ type: "error", message: "Chỉ PM của dự án mới được phép link repo." }));
      return;
    }

    const url = (repoUrl || "").trim();
    if (!url) {
      dispatch(setPopup({ type: "error", message: "Vui lòng nhập URL repo (vd: https://github.com/owner/repo)" }));
      return;
    }
    if (!/^https:\/\/github\.com\/[^\/]+\/[^\/]+/i.test(url)) {
      dispatch(setPopup({ type: "error", message: "Định dạng repo URL không hợp lệ" }));
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
      dispatch(setPopup({ type: "success", message: resp.message || "Link repo thành công" }));
      setProject((p) => (p ? { ...p, repoLink: url } : p));
      await fetchProject();
    } else {
      dispatch(setPopup({ type: "error", message: resp?.message || "Link repo thất bại" }));
    }
  };

  // Early returns
  if (loadingProject) return <Typography>Loading project details...</Typography>;
  if (!project) return <Typography>Không tìm thấy dự án.</Typography>;

  const overdue = isOverdue(project.deadline);
  const daysLeft = calculateDaysRemaining(project.deadline);
  const daysLate = getDaysOverdue(project.deadline);

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
        {/* Back to list */}
        <Button
          component={RouterLink}
          to="/management/projects"
          startIcon={<ArrowBack />}
          sx={{ mb: 1, textTransform: "none", fontWeight: 600 }}
        >
          Back to Projects
        </Button>

        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mb: 3 }}>
          <Paper
            sx={{
              p: 2,
              background: "linear-gradient(135deg, #118D57 0%, #10B981 100%)",
              borderRadius: 4,
              boxShadow: "0 8px 24px rgba(17, 141, 87, 0.3)",
            }}
          >
            <Assignment sx={{ color: "white", fontSize: 28 }} />
          </Paper>
          <Box>
            <Typography
              variant="h5"
              sx={{
                background: "linear-gradient(135deg, #1F2937 0%, #4B5563 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 700,
              }}
            >
              Project Detail
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Manage phases, tasks & members
            </Typography>
          </Box>
        </Stack>

        {/* Project Info Card */}
        <Card
          sx={{
            borderRadius: 3,
            backgroundColor: "white",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
            mb: 4,
          }}
        >
          <CardContent>
            {/* === Header + Repo inline === */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
                gap: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {project.name}
              </Typography>

              <Stack direction="row" spacing={1.25} alignItems="center">
                {repoLinked ? (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNew />}
                      href={project.repoLink}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      Mở trên GitHub
                    </Button>
                    <IconButton onClick={handleMenuClick}>
                      <MoreVert />
                    </IconButton>
                  </>
                ) : isPM ? (
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
                      Link Repo
                    </Button>
                    <IconButton onClick={handleMenuClick}>
                      <MoreVert />
                    </IconButton>
                  </>
                ) : (
                  <>
                    {/* Người không phải PM & chưa link repo: không thấy ô nhập */}
                    <IconButton onClick={handleMenuClick}>
                      <MoreVert />
                    </IconButton>
                  </>
                )}
              </Stack>
            </Box>

            {/* Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              {/* Chỉ PM mới thấy Connect GitHub */}
              {isPM && !githubConnected ? (
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    connectGithub();
                  }}
                  disabled={isProjectCanceled}
                >
                  <ListItemIcon>
                    <GitHub fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Connect GitHub" />
                </MenuItem>
              ) : isPM && githubConnected ? (
                <MenuItem disabled>
                  <ListItemIcon>
                    <GitHub fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="GitHub Connected" />
                </MenuItem>
              ) : null}

              <MenuItem
                onClick={() => {
                  setOpenEditForm(true);
                  handleMenuClose();
                }}
              >
                <ListItemIcon>
                  <Edit fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Edit Project" />
              </MenuItem>

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
            </Menu>

            {/* Chips */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mb={2}>
              <Chip
                icon={<Schedule sx={{ fontSize: 16 }} />}
                label={formatStatus(project.status)}
                size="small"
                color={getStatusColor(project.status)}
              />
              {project.documentCode && <Chip label={project.documentCode} size="small" variant="outlined" />}
              {project.pmName && <Chip label={`PM: ${project.pmName}`} size="small" variant="outlined" />}
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
              sx={{ px: 1, py: 1.2, backgroundColor: "#F9FAFB", borderRadius: 2 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ backgroundColor: "#3B82F6", color: "white", p: 1, borderRadius: 2 }}>
                  <CalendarToday sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {`${formatDate(project.createdAt)} - ${formatDate(project.deadline)}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Project Timeline
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    backgroundColor: "#10B981",
                    color: "white",
                    p: 1,
                    borderRadius: 2,
                  }}
                >
                  <AccessTime sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ color: overdue ? "error.main" : "success.main" }}
                  >
                    {overdue ? `${daysLate} days overdue` : `${daysLeft} days left`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {overdue ? "Overdue" : "Remaining"}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

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
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Paper
                sx={{
                  p: 1.5,
                  background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                  borderRadius: 3,
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
              >
                <TrendingUp sx={{ color: "white", fontSize: 24 }} />
              </Paper>
              <Typography
                variant="h6"
                sx={{
                  background: "linear-gradient(135deg, #1F2937 0%, #4B5563 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 600,
                }}
              >
                Phase Management
              </Typography>
            </Stack>

            <TextField
              placeholder="Search tasks..."
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
              <Typography>Chưa có phase nào</Typography>
            ) : (
              phases.map((phase) => {
                const filteredTasks = getFilteredTasks(phase.tasks || []);
                const taskCounts = getTaskStatusCounts(filteredTasks);

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
                    <AccordionSummary component="div" expandIcon={<ExpandMore />}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
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
                            {phase.displayName || `Phase ${phase.sequence}: ${phase.name}`}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={formatStatus(phase.status)}
                            color={getStatusColor(phase.status)}
                            size="small"
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isProjectCanceled) return;
                              openUpdatePhaseDialog(phase);
                            }}
                            disabled={isProjectCanceled}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    </AccordionSummary>

                    <AccordionDetails sx={{ pt: 0 }}>
                      <Stack spacing={3}>
                        {/* Phase Info */}
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ px: 1, py: 1.2, backgroundColor: "#F9FAFB", borderRadius: 2 }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ backgroundColor: "#3B82F6", color: "white", p: 1, borderRadius: 2 }}>
                              <CalendarToday sx={{ fontSize: 18 }} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                Deadline: {phase.deadline}
                              </Typography>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Add />}
                                onClick={() => handleOpenAddTask(phase)}
                                disabled={isProjectCanceled || !canCreateTask(phase)}
                                sx={{ textTransform: "capitalize" }}
                              >
                                Create Task
                              </Button>
                            </Box>
                          </Stack>

                          {phase.status !== "Chưa bắt đầu" && (
                            <Box sx={{ minWidth: 120 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Typography variant="body2" fontWeight={600}>
                                  Progress
                                </Typography>
                                <Typography variant="body2" color="primary.main" fontWeight={600}>
                                  {phase.progress ?? 0}%
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={typeof phase.progress === "number" ? phase.progress : 0}
                                sx={{ height: 8, borderRadius: 5 }}
                              />
                            </Box>
                          )}
                        </Stack>

                        {/* Tasks */}
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              Tasks ({taskCounts.total})
                            </Typography>

                            {taskCounts.total > 0 && (
                              <>
                                <Typography variant="body2" color="text.secondary">-</Typography>
                                <Chip
                                  label={`${formatStatus("PLANNING")} (${taskCounts["PLANNING"]})`}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                                <Chip
                                  label={`${formatStatus("IN_PROGRESS")} (${taskCounts["IN_PROGRESS"]})`}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                                <Chip
                                  label={`${formatStatus("COMPLETED")} (${taskCounts["COMPLETED"]})`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ fontSize: "0.75rem" }}
                                />
                              </>
                            )}
                          </Stack>

                          <Box
                            sx={{
                              maxHeight: 300,
                              overflowY: "auto",
                              "&::-webkit-scrollbar": { width: 6 },
                              "&::-webkit-scrollbar-track": { bgcolor: "#f1f1f1", borderRadius: 3 },
                              "&::-webkit-scrollbar-thumb": { bgcolor: "#c1c1c1", borderRadius: 3 },
                            }}
                          >
                            {filteredTasks.length === 0 ? (
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
                                <Typography variant="body2" color="text.secondary">
                                  {searchTerm.trim()
                                    ? "Không tìm thấy task nào phù hợp."
                                    : "Chưa có task nào. Hãy thêm task đầu tiên!"}
                                </Typography>
                              </Paper>
                            ) : (
                              <Stack spacing={1}>
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
                                      "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                                      ...(isPhaseLockedForTaskEditing(phase, phases) && {
                                        opacity: 0.6,
                                        cursor: "not-allowed",
                                        "&:hover": { boxShadow: "none" },
                                      }),
                                    }}
                                    onClick={() => {
                                      if (isPhaseLockedForTaskEditing(phase, phases)) {
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
                                      sx={{
                                        p: 1.5,
                                        py: 1,
                                        width: "100%",
                                        "&:last-child": { pb: 1 },
                                      }}
                                    >
                                      <Stack direction="row" spacing={2} alignItems="center">
                                        {/* Task name (ellipsis) */}
                                        <Box display="flex" alignItems="center" gap={1.25} flex={1} minWidth={0}>
                                          {getStatusIcon(task.status)}
                                          <Typography
                                            fontWeight={600}
                                            noWrap
                                            sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                            title={task.name}
                                          >
                                            {task.name}
                                          </Typography>
                                        </Box>

                                        {/* Assignee */}
                                        {task.assigneeId && (
                                          <Box sx={{ minWidth: 140 }}>
                                            <Stack sx={{ minWidth: 0 }}>
                                              <Typography variant="caption" noWrap fontWeight={600}>
                                                {task.assigneeName || "(No name)"}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary" noWrap>
                                                {task.assigneeUsername ? `@${task.assigneeUsername}` : ""}
                                              </Typography>
                                            </Stack>
                                          </Box>
                                        )}

                                        {/* Status */}
                                        <Chip
                                          label={formatStatus(task.status)}
                                          size="small"
                                          color={getStatusColor(task.status)}
                                          sx={{ minWidth: 80, "& .MuiChip-label": { fontWeight: 500 }, whiteSpace: "nowrap" }}
                                        />

                                        {/* Size */}
                                        {task.size && (
                                          <Chip
                                            label={`Size: ${task.size}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ minWidth: 70, fontWeight: 600, whiteSpace: "nowrap" }}
                                          />
                                        )}

                                        {/* Deadline */}
                                        {task.deadline && (
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                            sx={{ minWidth: 88, textAlign: "center", whiteSpace: "nowrap" }}
                                            title={task.deadline}
                                          >
                                            {task.deadline}
                                          </Typography>
                                        )}
                                      </Stack>
                                    </CardContent>
                                  </Card>
                                ))}
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
          open={openAddTask}
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
          open={openCreatePhase && !isProjectCanceled}
          onClose={() => setOpenCreatePhase(false)}
          projectDeadline={project.deadline}
          previousDeadline={previousDeadline}
          projectId={projectId}
          onCreated={async () => {
            await fetchPhases();
          }}
        />

        {/* Confirm delete (tạm thời khóa xóa) */}
        <Dialog
          open={confirmDelete.open}
          onClose={() => setConfirmDelete({ open: false, phaseId: null, taskId: null })}
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <Typography>Bạn có chắc chắn muốn xóa task này không? Hành động này không thể hoàn tác.</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button onClick={() => setConfirmDelete({ open: false, phaseId: null, taskId: null })}>
              Hủy
            </Button>
            <Button variant="contained" color="error" onClick={() => alert("Chức năng xóa task tạm khóa.")}>
              Xóa Task
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
          open={openAddMembers && !isProjectCanceled}
          onClose={() => setOpenAddMembers(false)}
          projectId={projectId}
          projectCanceled={isProjectCanceled}
          onAdded={() => {
            fetchMembers();
          }}
        />

        {/* Edit Project */}
        <ProjectForm
          open={openEditForm}
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
          open={openUpdatePhase && !isProjectCanceled}
          onClose={() => setOpenUpdatePhase(false)}
          phase={editingPhase}
          hasTasks={(editingPhase?.tasks?.length || 0) > 0}
          projectDeadline={project?.deadline}
          previousDeadline={editingPhase ? getPrevDeadline(editingPhase) : null}
          nextPhaseStatus={editingPhase ? getNextPhaseStatus(editingPhase) : null}
          onUpdated={async () => {
            await fetchPhases();
          }}
        />

        {/* Update Task */}
        <UpdateTaskDialog
          open={openUpdateTask}
          onClose={() => setOpenUpdateTask(false)}
          task={editingTask}
          projectId={projectId}
          phaseDeadline={currentPhaseForTask?.deadline}
          projectDeadline={project?.deadline}
          onUpdated={async () => {
            await fetchPhases();
          }}
        />
      </Container>
    </Box>
  );
}
