"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  Typography,
  Stack,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  Select,
  MenuItem as SelectItem,
  Grid,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  Search,
  ViewList,
  ViewModule,
  TrendingUp,
  Schedule,
  CalendarToday,
  AccessTime,
  MoreVert,
  Edit,
  Visibility,
} from "@mui/icons-material";
import { filterProjects, searchProjects } from "~/services/project.service";
import ProjectForm from "~/components/project/form/ProjectForm";
import {
  calculateDaysRemaining,
  formatDate,
  getDaysOverdue,
  getStatusColor,
  isOverdue,
  formatStatus,
} from "~/utils/project.utils";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const statusOptions = [
  { value: "PLANNING", labelKey: "status.planning", color: "info" },
  { value: "IN_PROGRESS", labelKey: "status.inProgress", color: "success" },
  { value: "COMPLETED", labelKey: "status.completed", color: "primary" },
  { value: "CANCELED", labelKey: "status.canceled", color: "default" },
];

export default function CompactProjectList() {
  const { t } = useTranslation("project");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewMode, setViewMode] = useState("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState({});

  const account = useSelector((state) => state.account.value);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      let result;
      if (searchTerm.trim()) {
        result = await searchProjects(searchTerm.trim());
      } else {
        const apiStatus = statusFilter === "ALL" ? undefined : statusFilter;
        result = await filterProjects(apiStatus);
      }

      if (account?.role === "PM") {
        result = (result || []).filter((p) => String(p.pmId) === String(account.id));
      }

      setProjects(result || []);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, account]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const canEditThisProject = (proj) => {
    if (!account?.role) return false;
    if (["ADMIN", "MANAGER"].includes(account.role)) return true;
    if (account.role === "PM") return String(proj?.pmId) === String(account.id);
    return false;
  };

  const handleOpenUpdate = (project) => {
    if (!project || !canEditThisProject(project)) return;
    setEditingProject(project || {});
    setFormOpen(true);
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
        <Stack direction="row" alignItems="center" spacing={2.5} sx={{ mb: 3 }}>
          <Paper
            sx={{
              p: 2,
              background: "linear-gradient(135deg, #118D57 0%, #10B981 100%)",
              borderRadius: 4,
              boxShadow: "0 8px 24px rgba(17, 141, 87, 0.3)",
            }}
          >
            <TrendingUp sx={{ color: "white", fontSize: 28 }} />
          </Paper>

          {/* Header title with ellipsis */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 600,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={t("title")}
            >
              {t("title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {t("subtitle")}
            </Typography>
          </Box>
        </Stack>

        <Paper
          elevation={2}
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            backgroundColor: "#ffffff",
            mb: 4,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            alignItems: { md: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <TextField
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 400, md: 480 } }}
            size="small"
          />

          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <FormControl sx={{ minWidth: 140 }} size="small">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty>
                <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </Select>
            </FormControl>

            <IconButton
              onClick={() => setViewMode("list")}
              color={viewMode === "list" ? "primary" : "default"}
              aria-label={t("aria.listView")}
              title={t("aria.listView")}
            >
              <ViewList />
            </IconButton>
            <IconButton
              onClick={() => setViewMode("grid")}
              color={viewMode === "grid" ? "primary" : "default"}
              aria-label={t("aria.gridView")}
              title={t("aria.gridView")}
            >
              <ViewModule />
            </IconButton>
          </Stack>
        </Paper>

        {loading ? (
          <Typography>{t("loading")}</Typography>
        ) : !Array.isArray(projects) || projects.length === 0 ? (
          <Typography>{t("noProjects")}</Typography>
        ) : viewMode === "list" ? (
          <Stack spacing={3}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onUpdateClick={handleOpenUpdate} />
            ))}
          </Stack>
        ) : (
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item key={project.id}>
                <ProjectCard project={project} sx={{ width: "560px" }} onUpdateClick={handleOpenUpdate} />
              </Grid>
            ))}
          </Grid>
        )}

        <ProjectForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          initialData={editingProject}
          onSuccess={async () => {
            const result = await filterProjects(statusFilter === "ALL" ? undefined : statusFilter);
            setProjects(result || []);
          }}
        />
      </Container>
    </Box>
  );
}

function ProjectCard({ project, sx = {}, onUpdateClick }) {
  const { t } = useTranslation("project");
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const account = useSelector((state) => state.account.value);

  const handleMenuClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleUpdate = () => {
    handleClose();
    onUpdateClick?.(project);
  };
  const handleViewDetail = () => {
    handleClose();
    navigate(`/management/projects/${project.id}`);
  };

  const canEditThisProject = (() => {
    if (!account?.role) return false;
    if (["ADMIN", "MANAGER"].includes(account.role)) return true;
    if (account.role === "PM") return String(project.pmId) === String(account.id);
    return false;
  })();

  const progress = project.progress ?? 0;
  const isLate =
    isOverdue(project.deadline) &&
    project.status !== "COMPLETED" &&
    project.status !== "CANCELED";

  const showTimeStatus = project.status !== "COMPLETED" && project.status !== "CANCELED";

  return (
    <Card
      sx={{
        width: "100%",
        borderRadius: 3,
        backgroundColor: "white",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
        ...sx,
      }}
    >
      <CardContent>
        {/* ===== Title row with ellipsis ===== */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            noWrap
            title={project.name}
            sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
          >
            {project.name}
          </Typography>
          <IconButton onClick={handleMenuClick} aria-label={t("aria.openMenu")} title={t("aria.openMenu")}>
            <MoreVert />
          </IconButton>
        </Box>

        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          {canEditThisProject ? (
            <MenuItem onClick={handleUpdate}>
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t("action.update")} />
            </MenuItem>
          ) : null}

          <MenuItem onClick={handleViewDetail}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t("action.viewDetail")} />
          </MenuItem>
        </Menu>

        {/* Description (2 lines) */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={project.description || ""}
        >
          {project.description}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mt={1}>
          <Chip
            icon={<Schedule sx={{ fontSize: 16 }} />}
            label={t(`statusLabel.${project.status}`, { defaultValue: formatStatus(project.status) })}
            size="small"
            color={getStatusColor(project.status)}
          />
          {project.documentCode && <Chip label={project.documentCode} size="small" variant="outlined" />}
          {project.pmName && <Chip label={`PM: ${project.pmName}`} size="small" variant="outlined" />}
        </Stack>

        {/* Progress block */}
        <Box
          mt={1}
          sx={{
            minHeight: 42,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {project.status !== "PLANNING" ? (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <LinearProgress
                  variant="determinate"
                  value={Number.isFinite(progress) ? progress : 0}
                  sx={{ height: 8, borderRadius: 5, flex: 1, mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {Number.isFinite(progress) ? progress : 0}%
                </Typography>
              </Stack>

              <Typography variant="caption" color="text.secondary" mt={0.5}>
                {`${project.doneTask ?? 0} / ${project.totalTask ?? 0} ${t("tasksCompleted")}`}
              </Typography>
            </>
          ) : null}
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 1, py: 1.2, backgroundColor: "#F9FAFB", borderRadius: 2 }}
          mt={2}
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
                {t("projectTimeline")}
              </Typography>
            </Box>
          </Stack>

          {showTimeStatus && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  backgroundColor: isLate ? "#EF4444" : "#10B981",
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
                  sx={{ color: isLate ? "error.main" : "success.main" }}
                >
                  {isLate
                    ? t("daysOverdue", { count: getDaysOverdue(project.deadline) })
                    : t("daysLeft", { count: calculateDaysRemaining(project.deadline) })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isLate ? t("overdue") : t("remaining")}
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
