"use client"

import { useEffect, useState } from "react"
import {
  Box, Grid, Typography, Chip, Button, Stack,
  TextField, InputAdornment, MenuItem, FormControl,
  Select, Paper, Divider, IconButton, Menu,
  List, ListItem, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox
} from "@mui/material"
import { MoreVert, Search } from "@mui/icons-material"
import { formatDate } from "~/utils/project.utils"
import { getProjectDetail } from "~/services/project.service"
import {
  getProjectEmployees,
  getAvailableEmployees,
  addEmployeesToProject
} from "~/services/project-employee.service"
import TaskCreate from "~/components/task/form/TaskCreate"

export default function ProjectDetail({ projectId }) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [anchorEl, setAnchorEl] = useState(null)
  const [membersDialogOpen, setMembersDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [projectMembers, setProjectMembers] = useState([])
  const [availableMembers, setAvailableMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    

    const fetch = async () => {
      setLoading(true)
      try {
        const res = await getProjectDetail(projectId)
        console.log("Kết quả từ API:", res)
        console.log("Project detail trả về:", res.data)
        if (res?.status === 200 && res?.data) {
          setProject(res.data)
        } else {
          console.error("Không lấy được dữ liệu project")
        }
      } catch (err) {
        console.error("Lỗi khi gọi getProjectDetail:", err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  },
  
  [projectId])

  const reloadProject = async () => {
    try {
      const res = await getProjectDetail(projectId)
      if (res?.status === 200 && res?.data) {
        setProject(res.data)
      }
    } catch (err) {
      console.error("Lỗi khi reload project:", err)
    }
  }

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget)
  const handleCloseMenu = () => setAnchorEl(null)

  const handleOpenMembersDialog = async () => {
    const res = await getProjectEmployees(projectId)
    if (res?.status === 200) {
      setProjectMembers(res.data)
      setMembersDialogOpen(true)
    }
    handleCloseMenu()
  }

  const handleOpenAddDialog = async () => {
    const res = await getAvailableEmployees(projectId)
    if (res?.status === 200) {
      setAvailableMembers(res.data)
      setSelectedMembers([])
      setAddDialogOpen(true)
    }
    handleCloseMenu()
  }

  const handleConfirmAdd = async () => {
    const res = await addEmployeesToProject(projectId, { employeeIds: selectedMembers })
    if (res?.status === 200) {
      setAddDialogOpen(false)
    }
  }

  const handleToggleSelect = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleCreateTask = () => {
    setCreateTaskOpen(true)
    handleCloseMenu()
  }

  if (loading || !project) return <Typography>Loading...</Typography>

  const filteredTasks = project.tasks?.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || task.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  return (
    <Box sx={{ p: 3, backgroundColor: "#F9FAFB", minHeight: "100vh" }}>
      {/* Project Info */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={10}>
            <Typography variant="h5" fontWeight={700}>{project.name}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>{project.description}</Typography>
            <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
              <Chip label={project.status} color="primary" />
              <Chip label={project.priority} color="warning" />
              <Chip label={`PM: ${project.pmName}`} variant="outlined" />
              <Chip label={`From ${formatDate(project.createdAt)} to ${formatDate(project.deadline)}`} />
            </Stack>
          </Grid>
          <Grid item xs={12} md={2} sx={{ textAlign: "right" }}>
            <IconButton onClick={handleOpenMenu}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
              <MenuItem onClick={handleCreateTask}>Create Task</MenuItem>
              <MenuItem onClick={handleOpenAddDialog}>Add Member</MenuItem>
              <MenuItem onClick={handleOpenMembersDialog}>View Members</MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </Paper>      {/* Task List */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
          <TextField
            size="small"
            placeholder="Search task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty>
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="PLANNING">Planning</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELED">Canceled</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)", pr: 1 }}>
          {filteredTasks.map((task) => (
            <Paper key={task.id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontWeight={600}>{task.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontSize: 13 }}>
                    {`${task.doneSubtasks} / ${task.totalSubtasks} subtasks • Deadline: ${formatDate(task.deadline)}`}
                  </Typography>
                </Box>

              </Stack>
            </Paper>
          ))}
        </Box>
      </Paper>

      {/* View Members Dialog */}
      <Dialog open={membersDialogOpen} onClose={() => setMembersDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Project Members</DialogTitle>
        <DialogContent>
          <List>
            {projectMembers.map((emp) => (
              <ListItem key={emp.id}>
                <ListItemText primary={emp.name} secondary={emp.role} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Members to Project</DialogTitle>
        <DialogContent>
          <List>
            {availableMembers.map((emp) => (
              <ListItem key={emp.id} button onClick={() => handleToggleSelect(emp.id)}>
                <ListItemText primary={emp.name} secondary={emp.role} />
                <Checkbox checked={selectedMembers.includes(emp.id)} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmAdd} disabled={selectedMembers.length === 0}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Gắn form TaskCreate vào đây */}
      <TaskCreate
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={reloadProject}
        projectId={projectId}
      />
    </Box>
  )
}