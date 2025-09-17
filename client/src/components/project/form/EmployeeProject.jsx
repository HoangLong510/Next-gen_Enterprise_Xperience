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
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useTranslation } from "react-i18next";

import {
  getProjectEmployees,
  removeEmployeesFromProject,
} from "~/services/project-employee.service";
import { getPhasesWithTasksByProject } from "~/services/phase.service";

export default function EmployeeProject({ open, onClose, projectId, onRemoved }) {
  const { t } = useTranslation("project");

  const [loading, setLoading] = useState(false);

  // Giữ nguồn dữ liệu đầy đủ, tránh mutate khi search
  const [allEmployees, setAllEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Danh sách employeeId đang được assign vào task của project (Set để check O(1))
  const [assignedIds, setAssignedIds] = useState(() => new Set());

  // Dùng sentinel ổn định thay vì nhãn đã dịch
  const ALL = "__ALL__";
  const [selectedDepartment, setSelectedDepartment] = useState(ALL);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // helper để extract data array từ response
  const extractList = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (res?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  };

  // Load lại danh sách members + map assignedIds
  const loadMembers = async () => {
    setLoading(true);
    try {
      const [resMembers, resPhases] = await Promise.all([
        getProjectEmployees(projectId),
        getPhasesWithTasksByProject(projectId),
      ]);

      const members = extractList(resMembers);
      setAllEmployees(members);

      // Tính các employeeId đang được assign (bỏ qua task CANCELED)
      const phasesArr = Array.isArray(resPhases?.data) ? resPhases.data : [];
      const assigned = new Set();
      for (const p of phasesArr) {
        const tasks = Array.isArray(p?.tasks) ? p.tasks : [];
        for (const tk of tasks) {
          if (tk?.assigneeId && tk?.status !== "CANCELED") {
            assigned.add(Number(tk.assigneeId));
          }
        }
      }
      setAssignedIds(assigned);

      // Loại bỏ những ID không còn tồn tại trong danh sách (hoặc đang bị assign)
      const memberIdSet = new Set(members.map((m) => Number(m.id)));
      setSelectedEmployees((prev) =>
        prev.filter((id) => memberIdSet.has(Number(id)) && !assigned.has(Number(id)))
      );
    } catch (e) {
      console.error(e);
      setAllEmployees([]);
      setAssignedIds(new Set());
      setSelectedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // lấy danh sách members khi mở dialog
  useEffect(() => {
    if (!open) return;
    loadMembers();
  }, [open, projectId]);

  // Build danh sách phòng ban (giá trị hiển thị đã dịch, value là sentinel hoặc tên phòng ban thô)
  const departments = useMemo(() => {
    const names = allEmployees
      .map((e) => e.departmentName)
      .filter((n) => typeof n === "string" && n.trim() !== "");
    const uniq = Array.from(new Set(names));
    return [{ value: ALL, label: t("members.allDepartments") }, ...uniq.map((n) => ({ value: n, label: n }))];
  }, [allEmployees, t]);

  // Lọc theo search
  const searchFiltered = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter((e) => {
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      return fullName.includes(q) || (e.username || "").toLowerCase().includes(q);
    });
  }, [allEmployees, searchTerm]);

  // Lọc theo phòng ban
  const departmentFiltered = useMemo(() => {
    return searchFiltered.filter((e) =>
      selectedDepartment === ALL ? true : e.departmentName === selectedDepartment
    );
  }, [searchFiltered, selectedDepartment]);

  // Chỉ các employee chưa assign mới eligible để chọn remove
  const eligibleFiltered = useMemo(
    () => departmentFiltered.filter((e) => !assignedIds.has(Number(e.id))),
    [departmentFiltered, assignedIds]
  );

  // tính trạng thái checkbox tổng
  const isAll =
    eligibleFiltered.length > 0 &&
    eligibleFiltered.every((e) => selectedEmployees.includes(e.id));
  const isIndet = selectedEmployees.length > 0 && !isAll;

  const toggleAll = (evt) => {
    if (evt.target.checked) setSelectedEmployees(eligibleFiltered.map((e) => e.id));
    else setSelectedEmployees([]);
  };

  const toggleOne = (id) =>
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // reset khi đóng
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedDepartment(ALL);
      setSelectedEmployees([]);
    }
  }, [open]);

  // gọi API xóa
  const handleRemove = async () => {
    setLoading(true);
    try {
      await removeEmployeesFromProject(projectId, { employeeIds: selectedEmployees });
      // Reset lựa chọn ngay để nút không còn hiển thị (n)
      setSelectedEmployees([]);
      // Reload list
      await loadMembers();
      // Cho parent biết để sync bên ngoài
      onRemoved?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const assignedTooltip = t("members.assignedTooltip", "Người này đã được assign vào task");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: "error.main", pb: 0.5 }}>
        {t("members.title")}
      </DialogTitle>
      <Box px={3} pb={1}>
        <Typography variant="body2" color="text.secondary" />
      </Box>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {/* Search + Filter */}
          <Box display="flex" gap={2}>
            <TextField
              placeholder={t("members.searchPlaceholder")}
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <InputLabel>{t("members.departmentLabel")}</InputLabel>
              <Select
                value={selectedDepartment}
                label={t("members.departmentLabel")}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon color="action" />
                  </InputAdornment>
                }
              >
                {departments.map((d) => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />

          {/* Header list */}
          {departmentFiltered.length > 0 && (
            <Box
              display="flex"
              alignItems="center"
              px={2}
              py={0.5}
              bgcolor="grey.50"
              borderRadius={1}
            >
              <Checkbox
                checked={isAll}
                indeterminate={isIndet}
                onChange={toggleAll}
                size="small"
                sx={{ mr: 0.5 }}
                disabled={eligibleFiltered.length === 0}
              />
              <Box flex={1}>
                <Typography fontWeight={700}>{t("members.table.name")}</Typography>
              </Box>
              <Box width={120}>
                <Typography fontWeight={700}>{t("members.table.department")}</Typography>
              </Box>
            </Box>
          )}

          {/* List members */}
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={24} color="error" />
              </Box>
            ) : (
              <List disablePadding>
                {departmentFiltered.length === 0 ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="text.secondary">{t("members.noMembers")}</Typography>
                  </Box>
                ) : (
                  departmentFiltered.map((e, i) => {
                    const fullName = `${e.firstName} ${e.lastName}`;
                    const isAssigned = assignedIds.has(Number(e.id));
                    const isChecked = selectedEmployees.includes(e.id);

                    const row = (
                      <ListItem disablePadding key={e.id}>
                        <ListItemButton
                          onClick={() => !isAssigned && toggleOne(e.id)}
                          sx={{ py: 0.5, opacity: isAssigned ? 0.6 : 1 }}
                          disabled={isAssigned}
                        >
                          <Checkbox
                            checked={isChecked}
                            // Ngăn click vào checkbox kích hoạt onClick của ListItemButton (toggle 2 lần)
                            onClick={(ev) => ev.stopPropagation()}
                            onChange={() => toggleOne(e.id)}
                            disabled={isAssigned}
                            sx={{ mr: 0.5 }}
                          />
                          <ListItemAvatar>
                            <Avatar src={e.avatar}>{fullName.charAt(0)}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={fullName}
                            secondary={e.username}
                            sx={{ mr: 1.5 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {e.departmentName}
                          </Typography>
                        </ListItemButton>
                      </ListItem>
                    );

                    // Tooltip không hoạt động trên element disabled, cần wrap bằng <span>
                    return (
                      <React.Fragment key={e.id}>
                        {isAssigned ? (
                          <Tooltip title={assignedTooltip} placement="top" arrow>
                            <span>{row}</span>
                          </Tooltip>
                        ) : (
                          row
                        )}
                        {i < departmentFiltered.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })
                )}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button
          variant="contained"
          color="error"
          disabled={selectedEmployees.length === 0}
          onClick={handleRemove}
        >
          {selectedEmployees.length > 0
            ? t("members.buttons.removeWithCount", { count: selectedEmployees.length })
            : t("members.buttons.remove")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
