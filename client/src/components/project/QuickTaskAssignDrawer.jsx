// src/components/project/form/QuickTaskAssignDrawer.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItemButton,
  Avatar,
} from "@mui/material";
import ImageIcon from "@mui/icons-material/Image";

import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import {
  createQuickTasksBulk,
  getDepartmentsApi,
  searchEmployeesApi,
  uploadPublicImageApi,
} from "~/services/project.service";

const MODE = {
  DEPARTMENT: "DEPARTMENT",
  EMPLOYEE: "EMPLOYEE",
};

export default function QuickTaskAssignDrawer({
  open,
  onClose,
  project,
  onDone,
}) {
  const dispatch = useDispatch();

  // ----- basic -----
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = React.useRef(null);
  // ----- mode -----
  const [mode, setMode] = useState(MODE.DEPARTMENT);

  // ----- departments (multi) -----
  const [departments, setDepartments] = useState([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);

  // cache employees by department for mode=DEPARTMENT
  const [deptEmpCache, setDeptEmpCache] = useState({}); // { [deptId]: [{id,label,avatar}] }
  const [loadingDeptEmployees, setLoadingDeptEmployees] = useState(false);

  // ----- employees (for mode=EMPLOYEE) -----
  const [assignees, setAssignees] = useState([]); // [{id,label,avatar}]
  const [empSearch, setEmpSearch] = useState("");
  const [empOptions, setEmpOptions] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [showEmpPreview, setShowEmpPreview] = useState(false);

  // ===== reset when open =====
  useEffect(() => {
    if (!open) return;
    setTaskName("");
    setTaskDesc("");
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setMode(MODE.DEPARTMENT);
    setSelectedDeptIds([]);
    setDepartments([]);
    setDeptEmpCache({});
    setAssignees([]);
    setEmpSearch("");
    setEmpOptions([]);

    (async () => {
      try {
        setDeptLoading(true);
        const depRes = await getDepartmentsApi();
        setDepartments(Array.isArray(depRes?.data) ? depRes.data : []);
      } finally {
        setDeptLoading(false);
      }
    })();
  }, [open]);

  // ===== search employees for Autocomplete (mode EMPLOYEE) =====
  useEffect(() => {
    let active = true;
    if (!open || mode !== MODE.EMPLOYEE) return;

    const keyword = empSearch.trim();
    const t = setTimeout(async () => {
      try {
        setEmpLoading(true);
        const res = await searchEmployeesApi(keyword);
        if (!active) return;
        if (res?.status === 200 && Array.isArray(res.data)) {
          setEmpOptions(
            res.data
              .filter((e) => e.email && e.email !== "N/A")
              .map((e) => ({
                id: e.id,
                label: `${e.email}${e.phone ? ` - ${e.phone}` : ""}`,
                avatar: e.avatar || null,
              }))
          );
        } else {
          setEmpOptions([]);
        }
      } finally {
        if (active) setEmpLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, mode, empSearch]);

  // ===== fetch employees by department (mode DEPARTMENT) =====
  useEffect(() => {
    if (!open || mode !== MODE.DEPARTMENT) return;
    const need = selectedDeptIds.filter((id) => !deptEmpCache[id]);
    if (need.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingDeptEmployees(true);
        const fetchOne = async (deptId) => {
          const res = await searchEmployeesApi("", { departmentId: deptId });
          if (res?.status === 200 && Array.isArray(res.data)) {
            return res.data
              .filter((e) => e.email && e.email !== "N/A")
              .map((e) => ({
                id: e.id,
                label: `${e.email}${e.phone ? ` - ${e.phone}` : ""}`,
                avatar: e.avatar || null,
              }));
          }
          return [];
        };
        const results = await Promise.all(need.map(fetchOne));
        if (cancelled) return;
        setDeptEmpCache((prev) => {
          const next = { ...prev };
          need.forEach((id, idx) => (next[id] = results[idx]));
          return next;
        });
      } finally {
        if (!cancelled) setLoadingDeptEmployees(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, selectedDeptIds, deptEmpCache]);

  // ===== computed =====
  const defaultName = useMemo(
    () => (project?.name ? `Kickoff: ${project.name}` : "Kickoff"),
    [project?.name]
  );
  const toId = (x) => String(x);

  // departments check-all
  const allDeptIds = useMemo(
    () => departments.map((d) => toId(d.id)),
    [departments]
  );
  const isAllDeptChecked =
    selectedDeptIds.length === allDeptIds.length && allDeptIds.length > 0;
  const isSomeDeptChecked = selectedDeptIds.length > 0 && !isAllDeptChecked;
  const toggleAllDepts = () =>
    setSelectedDeptIds((prev) =>
      prev.length === allDeptIds.length ? [] : allDeptIds
    );
  const toggleOneDept = (idStr) =>
    setSelectedDeptIds((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );

  // employees check-all
  const allEmpIds = useMemo(() => empOptions.map((o) => o.id), [empOptions]);
  const isAllEmpChecked =
    assignees.length > 0 && assignees.length === allEmpIds.length;
  const isSomeEmpChecked =
    assignees.length > 0 && assignees.length < allEmpIds.length;
  const empOptionsWithAll = useMemo(
    () => [{ id: "__all__", label: "Select all" }, ...empOptions],
    [empOptions]
  );

  // unique employees from selected departments
  const deptSelectedEmployees = useMemo(() => {
    const map = new Map();
    selectedDeptIds.forEach((id) =>
      (deptEmpCache[id] || []).forEach((e) => map.set(e.id, e))
    );
    return Array.from(map.values());
  }, [selectedDeptIds, deptEmpCache]);

  // ===== submit =====
  const handleCreate = async () => {
    if (!project?.id) return;
    setSubmitting(true);
    try {
      // 1) Upload ảnh nếu có
      let finalImageUrl = undefined;
      if (imageFile) {
        const up = await uploadPublicImageApi(imageFile);
        finalImageUrl = up?.data?.url || undefined;
      }

      // 2) Payload chung: name, description, imageUrl
      const basePayload = {
        name: (taskName || "").trim() || undefined,
        description: (taskDesc || "").trim() || undefined,
        imageUrl: finalImageUrl, // <-- ảnh tách riêng
      };

      // 3) Bổ sung theo mode
      const payload =
        mode === MODE.EMPLOYEE
          ? {
              ...basePayload,
              assigneeEmployeeIds: assignees.map((x) => x.id),
            }
          : {
              ...basePayload,
              departmentIds: selectedDeptIds.map((id) => Number(id)),
            };

      // 4) Validate chọn người nhận
      if (mode === MODE.EMPLOYEE && assignees.length === 0) {
        dispatch(
          setPopup({
            type: "error",
            message: "Please pick at least 1 employee.",
          })
        );
        return;
      }
      if (mode === MODE.DEPARTMENT && selectedDeptIds.length === 0) {
        dispatch(
          setPopup({
            type: "error",
            message: "Please pick at least 1 department.",
          })
        );
        return;
      }

      // 5) Gọi API tạo nhanh
      console.log(payload)
      const resp = await createQuickTasksBulk(project.id, payload);

      if (resp?.status === 201 && Array.isArray(resp?.data)) {
        dispatch(
          setPopup({
            type: "success",
            message: resp?.message || "Quick tasks created!",
          })
        );
        await onDone?.(resp.data);
        onClose?.();
      } else {
        dispatch(
          setPopup({
            type: "error",
            message: resp?.message || "Failed to create quick tasks",
          })
        );
      }
    } catch (e) {
      dispatch(
        setPopup({
          type: "error",
          message: "Server error while creating quick task",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocalImageSelect = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      dispatch(
        setPopup({ type: "error", message: "Please select an image file." })
      );
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(url);
  };

  const handlePickImageClick = () => fileInputRef.current?.click();

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview]
  );
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 640, maxWidth: "100vw" } }}
    >
      <Box
        p={3}
        display="flex"
        flexDirection="column"
        gap={2}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="h5" fontWeight={700}>
          Quick Task — Choose recipients
        </Typography>

        {/* Project chips */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip size="small" label={project?.name || "Project"} />
          {project?.pmName && (
            <Chip
              size="small"
              variant="outlined"
              label={`PM: ${project.pmName}`}
            />
          )}
          {project?.status && (
            <Chip
              size="small"
              variant="outlined"
              label={`Status: ${project.status}`}
            />
          )}
        </Box>

        {/* Task name */}
        <TextField
          label="Task name (leave empty to use default)"
          placeholder={defaultName}
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Task description (optional)"
          multiline
          minRows={3}
          value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)}
          onPaste={(e) => {
            const item = [...(e.clipboardData?.items || [])].find((i) =>
              i.type?.startsWith("image/")
            );
            if (item) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) handleLocalImageSelect(file);
            }
          }}
        />

        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ImageIcon />}
            onClick={handlePickImageClick}
          >
            Attach image
          </Button>
          {imageFile && (
            <Chip
              label={imageFile.name}
              onDelete={() => {
                setImageFile(null);
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImagePreview("");
              }}
              variant="outlined"
            />
          )}
        </Box>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleLocalImageSelect(f);
            e.target.value = "";
          }}
        />

        {imagePreview && (
          <Box mt={1}>
            <img
              src={imagePreview}
              alt="attachment preview"
              style={{
                maxWidth: "100%",
                borderRadius: 8,
                border: "1px solid #eee",
              }}
            />
          </Box>
        )}
        {/* Mode switch */}
        <FormControl component="fieldset">
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Send to
          </Typography>
          <RadioGroup
            row
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <FormControlLabel
              value={MODE.DEPARTMENT}
              control={<Radio />}
              label="By department"
            />
            <FormControlLabel
              value={MODE.EMPLOYEE}
              control={<Radio />}
              label="By employee"
            />
          </RadioGroup>
        </FormControl>

        {/* --- Mode: Department --- */}
        {mode === MODE.DEPARTMENT && (
          <>
            <FormControl fullWidth>
              <InputLabel id="dept-label">Departments</InputLabel>
              <Select
                multiple
                labelId="dept-label"
                value={selectedDeptIds}
                input={<OutlinedInput label="Departments" />}
                onChange={() => {}}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((sid) => {
                      const d = departments.find((x) => toId(x.id) === sid);
                      return (
                        <Chip
                          key={sid}
                          label={d?.name || sid}
                          sx={{ m: 0.25 }}
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={{ disableAutoFocusItem: true }}
              >
                {deptLoading && <MenuItem disabled>Loading…</MenuItem>}

                {!deptLoading && departments.length > 0 && (
                  <MenuItem
                    disableRipple
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleAllDepts();
                    }}
                    sx={{ bgcolor: "action.hover" }}
                  >
                    <Checkbox
                      size="small"
                      checked={isAllDeptChecked}
                      indeterminate={isSomeDeptChecked}
                    />
                    <ListItemText primary="Select all" />
                  </MenuItem>
                )}

                {!deptLoading &&
                  departments.map((d) => {
                    const idStr = toId(d.id);
                    const checked = selectedDeptIds.includes(idStr);
                    return (
                      <MenuItem
                        key={idStr}
                        disableRipple
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleOneDept(idStr);
                        }}
                      >
                        <Checkbox size="small" checked={checked} />
                        <ListItemText primary={d.name} />
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary">
              {selectedDeptIds.length === 0
                ? "Pick one or more departments to send a task to every employee in them."
                : loadingDeptEmployees
                ? "Loading employees…"
                : `Will send to ${deptSelectedEmployees.length} employees in the selected departments.`}
            </Typography>
            {selectedDeptIds.length > 0 && !loadingDeptEmployees && (
              <Box mt={1}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowEmpPreview((v) => !v)}
                  disabled={deptSelectedEmployees.length === 0}
                  sx={{ px: 0 }}
                >
                  {showEmpPreview ? "Hide employees" : "Show employees"} (
                  {deptSelectedEmployees.length})
                </Button>

                {showEmpPreview && (
                  <List
                    dense
                    sx={{
                      mt: 1,
                      maxHeight: 280,
                      overflowY: "auto",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {deptSelectedEmployees.map((u) => (
                      <ListItemButton key={u.id} disableRipple>
                        <Avatar
                          src={u.avatar || undefined}
                          sx={{ width: 28, height: 28, mr: 1 }}
                        />
                        <ListItemText primary={u.label} />
                      </ListItemButton>
                    ))}
                    {deptSelectedEmployees.length === 0 && (
                      <ListItemButton disabled>
                        <ListItemText primary="No employees in selected departments" />
                      </ListItemButton>
                    )}
                  </List>
                )}
              </Box>
            )}
          </>
        )}

        {/* --- Mode: Employee --- */}
        {mode === MODE.EMPLOYEE && (
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={empOptionsWithAll}
            value={assignees}
            onChange={(_, val) => {
              if (val.some((o) => o.id === "__all__")) {
                const next = isAllEmpChecked ? [] : [...empOptions];
                setAssignees(next);
              } else {
                setAssignees(val.filter((o) => o.id !== "__all__"));
              }
            }}
            onInputChange={(_, val) => setEmpSearch(val)}
            filterSelectedOptions
            getOptionLabel={(o) =>
              o.id === "__all__" ? "Select all" : o.label || ""
            }
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            loading={empLoading}
            openOnFocus
            renderOption={(props, option) => {
              if (option.id === "__all__") {
                return (
                  <li {...props} key="__all__">
                    <Checkbox
                      size="small"
                      checked={isAllEmpChecked}
                      indeterminate={isSomeEmpChecked}
                    />
                    <ListItemText primary="Select all" />
                  </li>
                );
              }
              const checked = assignees.some((a) => a.id === option.id);
              return (
                <li {...props} key={option.id}>
                  <Checkbox size="small" checked={checked} />
                  <ListItemText primary={option.label} />
                </li>
              );
            }}
            renderTags={(value, getTagProps) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {value
                  .filter((v) => v.id !== "__all__")
                  .map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={option.label}
                    />
                  ))}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Pick employees (multi-select)"
                placeholder="Type name/email to search…"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {empLoading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{
              "& .MuiAutocomplete-inputRoot": {
                flexWrap: "wrap",
                alignItems: "flex-start",
              },
              "& .MuiAutocomplete-tag": { m: 0.25 },
              "& .MuiAutocomplete-input": {
                flex: "1 0 100%",
                minWidth: "100%",
              },
            }}
          />
        )}

        {/* Actions */}
        <Box display="flex" gap={1} mt={1}>
          <Button
            variant="outlined"
            fullWidth
            onClick={onClose}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleCreate}
            disabled={submitting || project?.status === "CANCELED"}
            sx={{ borderRadius: 2, background: "primary.main" }}
          >
            {submitting ? "Creating..." : "Create"}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary">
          • <b>By department</b>: creates one task for each employee in the
          selected departments.
          <br />• <b>By employee</b>: creates one task for each selected
          employee.
          <br />• If nobody is selected, a single default task will be created
          (assignee = PM).
        </Typography>
      </Box>
    </Drawer>
  );
}
