// src/components/project/form/UpdateTaskDialog.jsx
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  IconButton,
  Box,
  Typography,
  Tooltip, // 👈 add Tooltip
} from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import HistoryIcon from "@mui/icons-material/History";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";

import { getTaskSizes, updateTask } from "~/services/task.service";
import { getProjectEmployees } from "~/services/project-employee.service";
import AssignmentHistoryDialog from "./AssignmentHistoryDialog";

// ======= helpers =======
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Chuẩn hoá YYYY-MM-DD
const toYMD = (input) => {
  if (!input) return "";
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ✅ Dùng các key trùng với errors.json
const makeSchema = (phaseDeadline, projectDeadline) =>
  yup.object({
    name: yup
      .string()
      .required("task-name-is-required")
      .min(3, "task-name-must-be-at-least-3-characters")
      .max(100, "task-name-must-be-at-most-100-characters"),
    description: yup
      .string()
      .required("description-is-required")
      .min(10, "description-must-be-at-least-10-characters")
      .max(1000, "description-must-be-at-most-1000-characters"),
    size: yup.string().required("size-is-required"),
    assigneeId: yup.number().nullable().required("assignee-is-required"),
    deadline: yup
      .string()
      .required("deadline-is-required")
      .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
      .test(
        "not-after-phase",
        "deadline-after-phase-deadline",
        (v) => !v || !phaseDeadline || toYMD(v) <= toYMD(phaseDeadline)
      )
      .test(
        "not-after-project",
        "deadline-after-project-deadline",
        (v) => !v || !projectDeadline || toYMD(v) <= toYMD(projectDeadline)
      ),
  });

export default function UpdateTaskDialog({
  open,
  onClose,
  task, // { id, name, description, size, assigneeId, deadline, ... }
  projectId,
  phaseDeadline, // YYYY-MM-DD | ISO
  projectDeadline, // YYYY-MM-DD | ISO
  onUpdated,
}) {
  const dispatch = useDispatch();

  // ĐÚNG namespace bạn đang dùng
  const { t: tTask } = useTranslation("task");
  const { t: tErrors } = useTranslation("errors");
  const { t: tMessages } = useTranslation("messages");

  // helper: dịch key từ server nếu có
  const tryTranslate = (key) => {
    if (!key) return null;
    const m = tMessages(key);
    if (m && m !== key) return m;
    const e = tErrors(key);
    if (e && e !== key) return e;
    const tk = tTask(key);
    if (tk && tk !== key) return tk;
    return null;
    // nếu cả 3 đều không có -> trả null để fallback sang message mặc định
  };

  const schema = useMemo(
    () => makeSchema(phaseDeadline, projectDeadline),
    [phaseDeadline, projectDeadline]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: task?.name || "",
      description: task?.description || "",
      size: task?.size || "M",
      assigneeId: task?.assigneeId ?? null,
      deadline: toYMD(task?.deadline || ""),
    },
  });

  const [sizeOptions, setSizeOptions] = useState(["S", "M", "L"]);
  const [members, setMembers] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [openHistory, setOpenHistory] = useState(false);

  // Lưu deadline gốc để chỉ chặn "quá khứ" khi người dùng đổi deadline
  const initialDeadlineRef = useRef("");

  const filter = createFilterOptions({
    stringify: (opt) =>
      `${opt.firstName || ""} ${opt.lastName || ""} ${opt.username || ""} ${opt.email || ""}`.toLowerCase(),
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const sizes = await getTaskSizes();
        setSizeOptions(Array.isArray(sizes) && sizes.length ? sizes : ["S", "M", "L"]);
      } catch {
        setSizeOptions(["S", "M", "L"]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !projectId) return;
    (async () => {
      try {
        const res = await getProjectEmployees(projectId);
        const list =
          (Array.isArray(res?.data?.data) && res.data.data) ||
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res) && res) ||
          [];
        setMembers(list);
      } catch {
        setMembers([]);
      }
    })();
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const normalizedDeadline = toYMD(task?.deadline || "");
    reset({
      name: task?.name || "",
      description: task?.description || "",
      size: task?.size || (sizeOptions.includes("M") ? "M" : sizeOptions[0]),
      assigneeId: task?.assigneeId ?? null,
      deadline: normalizedDeadline,
    });
    initialDeadlineRef.current = normalizedDeadline;
    setAssigneeSearch("");
  }, [open, task, reset, sizeOptions]);

  // LUÔN gửi deadline trong payload
  const buildPayload = (values) => ({
    name: values.name?.trim(),
    description: values.description?.trim(),
    size: String(values.size).trim().toUpperCase(),
    assigneeId: values.assigneeId,
    deadline: toYMD(values.deadline),
  });

  const combinedMax = useMemo(() => {
    const arr = [phaseDeadline, projectDeadline].filter(Boolean).map(toYMD).sort();
    return arr[0];
  }, [phaseDeadline, projectDeadline]);

  const onSubmit = async (values) => {
    if (!task?.id) {
      dispatch(setPopup({ type: "error", message: tErrors("task-not-found") }));
      return;
    }

    // ❗Chỉ chặn "deadline quá khứ" nếu user THAY ĐỔI deadline
    const tStr = todayStr();
    const currentYmd = toYMD(values.deadline);
    const oldYmd = initialDeadlineRef.current;

    if (currentYmd < tStr && currentYmd !== oldYmd) {
      dispatch(setPopup({ type: "error", message: tErrors("deadline-cannot-be-in-the-past") }));
      return;
    }
    if (phaseDeadline && currentYmd > toYMD(phaseDeadline)) {
      dispatch(setPopup({ type: "error", message: tErrors("deadline-after-phase-deadline") }));
      return;
    }
    if (projectDeadline && currentYmd > toYMD(projectDeadline)) {
      dispatch(setPopup({ type: "error", message: tErrors("deadline-after-project-deadline") }));
      return;
    }

    const payload = buildPayload(values);

    try {
      const res = await updateTask(task.id, payload);
      if (res?.status === 200) {
        const msg = tryTranslate(res?.message) || tMessages("updated-successfully");
        dispatch(setPopup({ type: "success", message: msg }));
        onUpdated?.(res.data);
        onClose?.();
      } else {
        const errMsg = tryTranslate(res?.message) || tMessages("server-is-busy");
        dispatch(setPopup({ type: "error", message: errMsg }));
      }
    } catch {
      dispatch(setPopup({ type: "error", message: tMessages("server-is-busy") }));
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{tTask("update-task", "Cập nhật công việc")}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            {/* Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={tTask("task-name")}
                  fullWidth
                  size="small"
                  error={!!errors.name}
                  helperText={errors.name ? tErrors(errors.name.message) || "" : ""}
                  autoFocus
                />
              )}
            />

            {/* Description */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={tTask("task-description")}
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  error={!!errors.description}
                  helperText={errors.description ? tErrors(errors.description.message) || "" : ""}
                />
              )}
            />

            {/* Size */}
            <Controller
              name="size"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={tTask("task-size")}
                  fullWidth
                  size="small"
                  error={!!errors.size}
                  helperText={errors.size ? tErrors(errors.size.message) || "" : ""}
                >
                  {sizeOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Assignee + History */}
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography component="label" sx={{ fontSize: 12, color: "text.secondary" }}>
                    {tTask("assign-to")}
                  </Typography>
                </Box>
                <Tooltip title={tTask("view-assignment-history")}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => setOpenHistory(true)}
                      aria-label={tTask("view-assignment-history")}
                    >
                      <HistoryIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={members}
                    value={members.find((m) => m.id === field.value) || null}
                    onChange={(_, v) => field.onChange(v ? v.id : null)}
                    inputValue={assigneeSearch}
                    onInputChange={(_, v) => setAssigneeSearch(v)}
                    filterOptions={(options, params) => filter(options, params)}
                    getOptionLabel={(opt) => {
                      if (!opt) return "";
                      const name = `${opt.firstName || ""} ${opt.lastName || ""}`.trim();
                      return name || opt.username || opt.email || "";
                    }}
                    isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                    noOptionsText={tTask("no-options")}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>
                            {`${option.firstName || ""} ${option.lastName || ""}`.trim() || tTask("no-name")}
                          </span>
                          <span style={{ opacity: 0.7 }}>
                            {option.username ? `@${option.username}` : option.email || ""}
                          </span>
                        </div>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        error={!!errors.assigneeId}
                        helperText={errors.assigneeId ? tErrors(errors.assigneeId.message) || "" : ""}
                      />
                    )}
                  />
                )}
              />
            </Box>

            {/* Deadline */}
            <Controller
              name="deadline"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={tTask("task-deadline")}
                  type="date"
                  fullWidth
                  size="small"
                  error={!!errors.deadline}
                  helperText={errors.deadline ? tErrors(errors.deadline.message) || "" : ""}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: toYMD(field.value) !== initialDeadlineRef.current ? todayStr() : undefined,
                    max: combinedMax || undefined,
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            {tTask("cancel")}
          </Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {tTask("save-changes", "Save changes")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment History */}
      <AssignmentHistoryDialog open={openHistory} taskId={task?.id} onClose={() => setOpenHistory(false)} />
    </>
  );
}
