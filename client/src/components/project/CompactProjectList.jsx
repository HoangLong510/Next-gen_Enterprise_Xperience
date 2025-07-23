"use client"

import { useEffect, useState } from "react"
import {
	Card,
	CardContent,
	Menu,
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
  MenuItem,
  Grid,
  Chip,
  LinearProgress,
} from "@mui/material"
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
  PersonAdd,
  Visibility,
} from "@mui/icons-material"
import {
  filterProjects,
  searchProjects,
} from "~/services/project.service"
import ProjectForm from "~/components/project/form/ProjectForm"
import {
  calculateDaysRemaining,
  formatDate,
  getDaysOverdue,
  getStatusColor,
  isOverdue,
  getPriorityColor,
} from "~/utils/project.utils"
import { useNavigate } from "react-router-dom"
const statusOptions = [
  { value: "PLANNING", label: "Planning", color: "info" },
  { value: "IN_PROGRESS", label: "In Progress", color: "success" },
  { value: "COMPLETED", label: "Completed", color: "primary" },
  { value: "CANCELED", label: "Canceled", color: "default" },
]

export default function CompactProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [viewMode, setViewMode] = useState("grid")
  const [formOpen, setFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState({})

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        let result
        if (searchTerm.trim()) {
          result = await searchProjects(searchTerm.trim())
        } else {
          result = await filterProjects(statusFilter, priorityFilter)
        }
        setProjects(result)
      } catch (err) {
        console.error("Failed to fetch projects", err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [searchTerm, statusFilter, priorityFilter])

  const handleOpenUpdate = (project) => {
    setEditingProject(project || {})
    setFormOpen(true)
  }

  // 👉 Tiếp theo mình sẽ gửi phần ProjectCard trong Part 2

  return (
    <>
  <Box
        sx={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #F8FAFC 0%, #E0F2FE 25%, #F0FDF4 50%, #FFFBEB 75%, #FEF2F2 100%)",
          position: "relative",
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", py: 3 }}>
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
              <TrendingUp sx={{ color: "white", fontSize: 28 }} />
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
                Project Management
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Track and manage all your projects
              </Typography>
            </Box>
          </Stack>

          {/* Filter */}
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
              placeholder="Search projects..."
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
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  {statusOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }} size="small">
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="ALL">All Priorities</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </Select>
              </FormControl>

              <IconButton
                onClick={() => setViewMode("list")}
                color={viewMode === "list" ? "primary" : "default"}
              >
                <ViewList />
              </IconButton>
              <IconButton
                onClick={() => setViewMode("grid")}
                color={viewMode === "grid" ? "primary" : "default"}
              >
                <ViewModule />
              </IconButton>
            </Stack>
          </Paper>

          {/* Project List */}
          {loading ? (
            <Typography>Loading...</Typography>
          ) : !Array.isArray(projects) || projects.length === 0 ? (
            <Typography>No projects found.</Typography>
          ) : viewMode === "list" ? (
            <Stack spacing={3}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onUpdateClick={handleOpenUpdate}
                />
              ))}
            </Stack>
          ) : (
            <Grid container spacing={3}>
              {projects.map((project) => (
                <Grid item key={project.id}>
                  <ProjectCard
                    project={project}
                    sx={{ width: "560px" }}
                    onUpdateClick={handleOpenUpdate}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Form */}
          <ProjectForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            initialData={editingProject}
            onSubmit={() => {
              const reload = async () => {
                const result = await filterProjects(statusFilter, priorityFilter)
                setProjects(result)
              }
              reload()
            }}
          />
        </Container>
      </Box>
    </>
  )
}
    
  function ProjectCard({ project, sx = {}, onUpdateClick }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const handleMenuClick = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleUpdate = () => {
    handleClose()
    onUpdateClick(project)
  }
const navigate = useNavigate()

const handleViewDetail = () => {
  handleClose()
  navigate(`/management/projects/${project.id}`)
}
  const progress = project.progress
  const isLate =
    isOverdue(project.deadline) &&
    project.status !== "COMPLETED" &&
    project.status !== "CANCELED"

  const showTimeStatus =
    project.status !== "COMPLETED" && project.status !== "CANCELED"

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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {project.name}
          </Typography>
          <IconButton onClick={handleMenuClick}>
            <MoreVert />
          </IconButton>
        </Box>

        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={handleUpdate}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Update" />
          </MenuItem>
<MenuItem onClick={handleViewDetail}>
  <ListItemIcon>
    <Visibility fontSize="small" />
  </ListItemIcon>
  <ListItemText primary="View Detail" />
</MenuItem>
        </Menu>

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
        >
          {project.description}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" mt={1}>
          <Chip
            label={project.priority}
            size="small"
            color={getPriorityColor(project.priority)}
          />
          <Chip
            icon={<Schedule sx={{ fontSize: 16 }} />}
            label={project.status}
            size="small"
            color={getStatusColor(project.status)}
          />
          {project.documentCode && (
            <Chip label={project.documentCode} size="small" variant="outlined" />
          )}
          {project.pmName && (
            <Chip label={`PM: ${project.pmName}`} size="small" variant="outlined" />
          )}
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 5, flex: 1, mr: 1 }}
          />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {progress}%
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {`${project.doneTask} / ${project.totalTask} tasks completed`}
        </Typography>

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
                Project Timeline
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
                    ? `${getDaysOverdue(project.deadline)} days overdue`
                    : `${calculateDaysRemaining(project.deadline)} days left`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isLate ? "Overdue" : "Remaining"}
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}