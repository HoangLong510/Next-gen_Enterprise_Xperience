// src/components/project/EmployeeProject.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Box,
  Chip,
  Button,
  Avatar,
  Typography,
  Divider,
  CircularProgress,
  Stack,
  InputAdornment,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";

import {
  getProjectEmployees,
  removeEmployeesFromProject,
} from "~/services/project-employee.service";

export default function EmployeeProject({ open, onClose, projectId, onRemoved }) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // helper để extract data array từ response
  const extractList = (res) => {
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  };
  // load lại danh sách members trong dialog
  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await getProjectEmployees(projectId);
      setEmployees(extractList(res));
      setSelectedEmployees([]); // reset chọn sau mỗi load
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  // lấy danh sách members khi mở dialog
  useEffect(() => {
    if (!open) return;
 loadMembers()
  }, [open, projectId]);

  // debounce search trên danh sách đã load sẵn
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setLoading(true);
      // tìm kiếm local dựa trên tên/fullName và username
      setEmployees(prev =>
        prev.filter(e => {
          const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
          return (
            fullName.includes(searchTerm.toLowerCase()) ||
            (e.username || "").toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
      );
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, open]);

  // build danh sách phòng ban từ departmentName, loại bỏ null/blank
  const departments = useMemo(() => {
    const names = employees
      .map(e => e.departmentName)
      .filter(n => typeof n === "string" && n.trim() !== "");
    return ["All Departments", ...Array.from(new Set(names))];
  }, [employees]);

  // lọc theo phòng ban
  const filtered = useMemo(() => {
    return employees.filter(e =>
      selectedDepartment === "All Departments"
        ? true
        : e.departmentName === selectedDepartment
    );
  }, [employees, selectedDepartment]);

  // chọn tất cả / chọn từng cái
  const isAll = filtered.length > 0 && filtered.every(e => selectedEmployees.includes(e.id));
  const isIndet = selectedEmployees.length > 0 && !isAll;

  const toggleAll = evt => {
    if (evt.target.checked) setSelectedEmployees(filtered.map(e => e.id));
    else setSelectedEmployees([]);
  };
  const toggleOne = id =>
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  // reset khi đóng
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedDepartment("All Departments");
      setSelectedEmployees([]);
    }
  }, [open]);

  // gọi API xóa
  const handleRemove = async () => {
    
     setLoading(true);
    try {
      await removeEmployeesFromProject(projectId, { employeeIds: selectedEmployees });
      // Sau khi xóa xong, load lại list trong dialog
      await loadMembers();
      // Nếu cần parent fetch lại toàn bộ members
      onRemoved();
 
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
    
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: "error.main", pb: 0.5 }}>
        Remove Team Members
      </DialogTitle>
      <Box px={3} pb={1}>
        <Typography variant="body2" color="text.secondary">
          Select members to remove from this project
        </Typography>
      </Box>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {/* Search + Filter */}
          <Box display="flex" gap={2}>
            <TextField
              placeholder="Search members..."
              size="small"
              fullWidth
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
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
                  <InputAdornment position="start">
                    <FilterListIcon color="action" />
                  </InputAdornment>
                }
              >
                {departments.map(d => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />

          {/* Header list */}
          {filtered.length > 0 && (
            <Box display="flex" alignItems="center" px={2} py={0.5} bgcolor="grey.50" borderRadius={1}>
              <Checkbox checked={isAll} indeterminate={isIndet} onChange={toggleAll} size="small" sx={{ mr:0.5 }} />
              <Box flex={1}><Typography fontWeight={700}>Name</Typography></Box>
              <Box width={120}><Typography fontWeight={700}>Department</Typography></Box>
            </Box>
          )}

          {/* List members */}
          <Box sx={{ border:1, borderColor:"divider", borderRadius:1 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={24} color="error"/>
              </Box>
            ) : (
              <List disablePadding>
                {filtered.length === 0 ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="text.secondary">No members found</Typography>
                  </Box>
                ) : filtered.map((e, i) => {
                  const fullName = `${e.firstName} ${e.lastName}`;
                  return (
                    <React.Fragment key={e.id}>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => toggleOne(e.id)} sx={{ py:0.5 }}>
                          <Checkbox checked={selectedEmployees.includes(e.id)} sx={{ mr:0.5 }}/>
                          <ListItemAvatar>
                            <Avatar src={e.avatar}>{fullName.charAt(0)}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={fullName}
                            secondary={e.username}
                            sx={{ mr:1.5 }}
                          />
                          <Chip label={e.departmentName} size="small" color="default"/>
                        </ListItemButton>
                      </ListItem>
                      {i < filtered.length -1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px:3, pb:2, gap:1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedEmployees.length===0}
          onClick={handleRemove}
        >
          Remove{selectedEmployees.length>0 && ` (${selectedEmployees.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
