// src/components/project/EmployeeProject.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Checkbox, List, ListItem, ListItemAvatar, ListItemText, ListItemButton,
  Box, Button, Avatar, Typography, Divider, CircularProgress, Stack,
  InputAdornment, TextField, FormControl, InputLabel, Select, MenuItem, Tooltip,
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
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Những employeeId đang được assign vào task (bỏ qua task CANCELED)
  const [assignedIds, setAssignedIds] = useState(() => new Set());

  const ALL = "__ALL__";
  const [selectedDepartment, setSelectedDepartment] = useState(ALL);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const extractList = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (res?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [resMembers, resPhases] = await Promise.all([
        getProjectEmployees(projectId),
        getPhasesWithTasksByProject(projectId),
      ]);

      const members = extractList(resMembers);
      setEmployees(members);

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

      // 🔧 Clear mọi chọn sau khi reload để tránh id mồ côi
      setSelectedEmployees([]);
    } catch (e) {
      console.error(e);
      setEmployees([]);
      setAssignedIds(new Set());
      setSelectedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadMembers();
  }, [open, projectId]);

  // Danh sách phòng ban
  const departments = useMemo(() => {
    const names = employees
      .map((e) => e.departmentName)
      .filter((n) => typeof n === "string" && n.trim() !== "");
    const uniq = Array.from(new Set(names));
    return [{ value: ALL, label: t("members.allDepartments") }, ...uniq.map((n) => ({ value: n, label: n }))];
  }, [employees, t]);

  // Lọc theo phòng ban + từ khóa (không mutate state gốc)
  const filtered = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return employees.filter((e) => {
      const byDept = selectedDepartment === ALL || e.departmentName === selectedDepartment;
      if (!byDept) return false;
      const fullName = `${e.firstName || ""} ${e.lastName || ""}`.trim().toLowerCase();
      return (
        !q ||
        fullName.includes(q) ||
        (e.username || "").toLowerCase().includes(q)
      );
    });
  }, [employees, selectedDepartment, searchTerm]);

  // Chỉ employee chưa assign mới được chọn để remove
  const eligibleFiltered = useMemo(
    () => filtered.filter((e) => !assignedIds.has(Number(e.id))),
    [filtered, assignedIds]
  );

  const isAll = eligibleFiltered.length > 0 && eligibleFiltered.every((e) => selectedEmployees.includes(e.id));
  const isIndet = selectedEmployees.length > 0 && !isAll;

  const toggleAll = (evt) => {
    if (evt.target.checked) setSelectedEmployees(eligibleFiltered.map((e) => e.id));
    else setSelectedEmployees([]);
  };

  const toggleOne = (id) =>
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Reset khi đóng
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedDepartment(ALL);
      setSelectedEmployees([]);
    }
  }, [open]);

  const handleRemove = async () => {
    setLoading(true);
    try {
      await removeEmployeesFromProject(projectId, { employeeIds: selectedEmployees });
      // ✅ Clear chọn ngay sau khi xóa để nút trở lại trạng thái bình thường
      setSelectedEmployees([]);
      await loadMembers();
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
          {filtered.length > 0 && (
            <Box display="flex" alignItems="center" px={2} py={0.5} bgcolor="grey.50" borderRadius={1}>
              <Checkbox
                checked={isAll}
                indeterminate={isIndet}
                onChange={toggleAll}
                size="small"
                sx={{ mr: 0.5 }}
                disabled={eligibleFiltered.length === 0}
                onClick={(e) => e.stopPropagation()}
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
                {filtered.length === 0 ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="text.secondary">{t("members.noMembers")}</Typography>
                  </Box>
                ) : (
                  filtered.map((e, i) => {
                    const fullName = `${e.firstName} ${e.lastName}`.trim();
                    const isAssigned = assignedIds.has(Number(e.id));

                    const row = (
                      <ListItem disablePadding key={e.id}>
                        <ListItemButton
                          onClick={() => !isAssigned && toggleOne(e.id)}
                          sx={{ py: 0.5, opacity: isAssigned ? 0.6 : 1 }}
                          disabled={isAssigned}
                        >
                          <Checkbox
                            checked={selectedEmployees.includes(e.id)}
                            onChange={() => toggleOne(e.id)}
                            disabled={isAssigned}
                            sx={{ mr: 0.5 }}
                            // ✅ Ngăn nổi bọt để không bị toggle 2 lần
                            onClick={(e) => e.stopPropagation()}
                          />
                          <ListItemAvatar>
                            <Avatar src={e.avatar}>{fullName.charAt(0)}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={fullName || t("noName")}
                            secondary={e.username}
                            sx={{ mr: 1.5 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {e.departmentName}
                          </Typography>
                        </ListItemButton>
                      </ListItem>
                    );

                    return (
                      <React.Fragment key={e.id}>
                        {isAssigned ? (
                          <Tooltip title={assignedTooltip} placement="top" arrow>
                            <span>{row}</span>
                          </Tooltip>
                        ) : (
                          row
                        )}
                        {i < filtered.length - 1 && <Divider />}
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
