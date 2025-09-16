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
import { useTranslation } from "react-i18next";

import {
  getAvailableEmployees,
  searchAvailableByNameAndRole,
  addEmployeesToProject,
} from "~/services/project-employee.service";

const ALL_DEPTS_VALUE = "__ALL_DEPARTMENTS__";

export default function EmployeeProjectAdd({ open, onClose, projectId, onAdded }) {
  const { t } = useTranslation("project");

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(ALL_DEPTS_VALUE);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const extractList = (res) => {
    if (Array.isArray(res?.data)) return res.data;
    if (res?.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  };

  const loadAvailable = async () => {
    setLoading(true);
    try {
      const res = await getAvailableEmployees(projectId);
      setEmployees(extractList(res));
      setSelectedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadAvailable();
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const tmr = setTimeout(() => {
      setLoading(true);
      const call = searchTerm.trim()
        ? searchAvailableByNameAndRole(projectId, searchTerm)
        : getAvailableEmployees(projectId);
      call
        .then((res) => setEmployees(extractList(res)))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(tmr);
  }, [searchTerm, projectId, open]);

  const enrichEmployee = (e) => {
    const displayName = `${e.firstName || ""} ${e.lastName || ""}`.trim();
    const initials = displayName
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w[0])
      .join("");
    return { displayName, initials };
  };

  const departments = useMemo(() => {
    const names = employees
      .map((e) => e.departmentName)
      .filter((n) => typeof n === "string" && n.trim() !== "");
    return [ALL_DEPTS_VALUE, ...Array.from(new Set(names))];
  }, [employees]);

  const filtered = useMemo(() => {
    return employees
      .filter((e) => !!e.departmentName)
      .filter((e) =>
        selectedDepartment === ALL_DEPTS_VALUE
          ? true
          : e.departmentName === selectedDepartment
      );
  }, [employees, selectedDepartment]);

  const isAll = filtered.length > 0 && filtered.every((e) => selectedEmployees.includes(e.id));
  const isIndet = selectedEmployees.length > 0 && !isAll;

  const toggleAll = (e) => {
    if (e.target.checked) setSelectedEmployees(filtered.map((x) => x.id));
    else setSelectedEmployees([]);
  };
  const toggleOne = (id) =>
    setSelectedEmployees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedDepartment(ALL_DEPTS_VALUE);
      setSelectedEmployees([]);
    }
  }, [open]);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await addEmployeesToProject(projectId, { employeeIds: selectedEmployees });
      onAdded?.();
      await loadAvailable();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, color: "primary.main", pb: 0.5 }}>
        {t("membersAdd.title")}
      </DialogTitle>
      <Box px={3} pb={1}>
        <Typography variant="body2" color="text.secondary">
          {t("membersAdd.subtitle")}
        </Typography>
      </Box>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {/* Search & Filter */}
          <Box display="flex" gap={2}>
            <TextField
              placeholder={t("membersAdd.searchPlaceholder")}
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 2 }}
            />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>{t("membersAdd.departmentLabel")}</InputLabel>
              <Select
                value={selectedDepartment}
                label={t("membersAdd.departmentLabel")}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <FilterList color="action" />
                  </InputAdornment>
                }
              >
                {departments.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d === ALL_DEPTS_VALUE ? t("membersAdd.allDepartments") : d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />

          {/* Headers */}
          {filtered.length > 0 && (
            <Box display="flex" alignItems="center" px={2} py={0.5} bgcolor="grey.50" borderRadius={1}>
              <Checkbox checked={isAll} indeterminate={isIndet} onChange={toggleAll} size="small" sx={{ mr: 0.5 }} />
              <Box flex={1}>
                <Typography fontWeight={700}>{t("membersAdd.table.name")}</Typography>
              </Box>
              <Box width={120}>
                <Typography fontWeight={700}>{t("membersAdd.table.department")}</Typography>
              </Box>
            </Box>
          )}

          {/* List */}
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List disablePadding>
                {filtered.length === 0 ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography color="text.secondary">{t("membersAdd.noEmployees")}</Typography>
                  </Box>
                ) : (
                  filtered.map((e, i) => {
                    const { displayName, initials } = enrichEmployee(e);
                    return (
                      <React.Fragment key={e.id}>
                        <ListItem disablePadding>
                          <ListItemButton onClick={() => toggleOne(e.id)}>
                            <Checkbox checked={selectedEmployees.includes(e.id)} sx={{ mr: 0.5 }} />
                            <ListItemAvatar>
                              <Avatar src={e.avatar}>{initials}</Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={displayName} secondary={e.username} sx={{ mr: 1.5 }} />
                            <Chip label={e.departmentName} size="small" />
                          </ListItemButton>
                        </ListItem>
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
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t("membersAdd.buttons.close")}</Button>
        <Button
          variant="contained"
          disabled={loading || selectedEmployees.length === 0}
          onClick={handleAdd}
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            t("membersAdd.buttons.addWithCount", { count: selectedEmployees.length })
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
