"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Button,
  Avatar,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Box,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import FilterList from "@mui/icons-material/FilterList";

import {
  getAvailableEmployees,
  searchAvailableByNameAndRole,
  addEmployeesToProject,
} from "~/services/project-employee.service";

export default function EmployeeProjectAdd({ open, onClose, projectId, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Chuyển response thành mảng quyết định
  const extractList = (res) => {
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  };
const loadAvailable = async () => {
   setLoading(true);
   try {
     const res = await getAvailableEmployees(projectId);
     setEmployees(extractList(res));
     setSelectedEmployees([]);           // reset selection
   } finally {
     setLoading(false);
   }
 };
  // Lấy danh sách khi mở dialog
  useEffect(() => {
    if (!open) return;
loadAvailable();
  }, [open, projectId]);

  // Tìm kiếm có debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const call = searchTerm.trim()
        ? searchAvailableByNameAndRole(projectId, searchTerm)
        : getAvailableEmployees(projectId);
      call
        .then(res => setEmployees(extractList(res)))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, projectId]);

  // Tạo tên đầy đủ và initials
  const enrichEmployee = (e) => {
    const displayName = `${e.firstName || ""} ${e.lastName || ""}`.trim();
    const initials = displayName
     .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join("");
    return { displayName, initials };
  };
  // Lấy departments
  const departments = useMemo(() => {
  const names = employees
    .map(e => e.departmentName)
    .filter(name => name && name.trim() !== "");
  return ["All Departments", ...Array.from(new Set(names))];
}, [employees]);
  // Lọc theo phòng ban
  const filtered = useMemo(
    () => employees
    .filter(e => e.departmentName)
    .filter(e =>
      selectedDepartment === "All Departments" || e.departmentName === selectedDepartment
    ),
    [employees, selectedDepartment]
  );

  const isAll = filtered.length > 0 && filtered.every(e => selectedEmployees.includes(e.id));
  const isIndet = selectedEmployees.length > 0 && !isAll;

  const toggleAll = e => {
    if (e.target.checked) setSelectedEmployees(filtered.map(e => e.id));
    else setSelectedEmployees([]);
  };
  const toggleOne = id =>
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  // Reset khi đóng
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedDepartment("All Departments");
      setSelectedEmployees([]);
    }
  }, [open]);

 // Gửi API thêm
const handleAdd = async () => {
   setLoading(true);
   try {
     await addEmployeesToProject(projectId, { employeeIds: selectedEmployees });
     onAdded();            // nếu cần chạy callback ở parent
     await loadAvailable(); // reload lại danh sách ngay trong form
   } finally {
     setLoading(false);
   }
 };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: "primary.main", pb: 0.5 }}>
        Add Team Members
      </DialogTitle>
      <Box px={3} pb={1}>
        <Typography variant="body2" color="text.secondary">
          Search and select employees to add to your project
        </Typography>
      </Box>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {/* Search & Filter */}
          <Box display="flex" gap={2}>
            <TextField
              placeholder="Search employees..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search color="action" /></InputAdornment>
                ),
              }}
              sx={{ flex: 2 }}
            />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                label="Department"
                onChange={e => setSelectedDepartment(e.target.value)}
                startAdornment={
                  <InputAdornment position="start"><FilterList color="action" /></InputAdornment>
                }
              >
                {departments.map(d => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />

          {/* Headers */}
          {filtered.length > 0 && (
            <Box display="flex" alignItems="center" px={2} py={0.5} bgcolor="grey.50" borderRadius={1}>
              <Checkbox checked={isAll} indeterminate={isIndet} onChange={toggleAll} size="small" sx={{ mr: 0.5 }} />
              <Box flex={1}><Typography fontWeight={700}>Name</Typography></Box>
              <Box width={120}><Typography fontWeight={700}>Department</Typography></Box>
            </Box>
          )}

          {/* List */}
          <Box sx={{ border:1, borderColor:"divider", borderRadius:1 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={3}><CircularProgress size={24} /></Box>
            ) : (
              <List disablePadding>
                {filtered.length === 0 ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="text.secondary">No employees found</Typography>
                  </Box>
                ) : filtered.map((e, i) => (
                  <React.Fragment key={e.id}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => toggleOne(e.id)}>
                         <Checkbox checked={selectedEmployees.includes(e.id)} sx={{ mr:0.5 }} />
       <ListItemAvatar>
         <Avatar src={e.avatar}>
           {/* Lấy initials an toàn */}
           { (() => { const { initials } = enrichEmployee(e); return initials; })() }
         </Avatar>
       </ListItemAvatar>
       <ListItemText
         primary={ (() => { const { displayName } = enrichEmployee(e); return displayName; })() }
         secondary={e.username}
         sx={{ mr:1.5 }}
       />
                        <Chip label={e.departmentName} size="small" />
                      </ListItemButton>
                    </ListItem>
                    {i < filtered.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2 }}>
        <Button onClick={onClose}>Close</Button>
       <Button
         variant="contained"
         disabled={loading || selectedEmployees.length===0}
         onClick={handleAdd}
       >
         {loading
           ? <CircularProgress size={20}/>
           : `Add${selectedEmployees.length>0 ? ` (${selectedEmployees.length})` : ""}`}
       </Button>
      </DialogActions>
    </Dialog>
  );
}
