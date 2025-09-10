// src/components/project/form/UpdateTaskDialog.jsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, TextField, MenuItem,
} from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";

import { getTaskSizes, updateTask } from "~/services/task.service";
import { getProjectEmployees } from "~/services/project-employee.service";

// hôm nay -> YYYY-MM-DD
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ❗ GỠ test "not-in-past" khỏi schema – sẽ check ở submit nếu deadline bị đổi
const makeSchema = (phaseDeadline, projectDeadline) =>
  yup.object({
    name: yup.string().required("task-name-is-required").min(3).max(100),
    description: yup.string().required("task-description-is-required").min(5).max(1000),
    size: yup.string().required("size-is-required"),
    assigneeId: yup.number().nullable().required("assignee-is-required"),
    deadline: yup
      .string()
      .required("deadline-is-required")
      .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
      .test("not-after-phase", "deadline-cannot-be-after-phase-deadline", (v) => !v || !phaseDeadline || v <= phaseDeadline)
      .test("not-after-project", "deadline-cannot-be-after-project-deadline", (v) => !v || !projectDeadline || v <= projectDeadline),
  });

export default function UpdateTaskDialog({
  open,
  onClose,
  task,                 // { id, name, description, size, assigneeId, deadline, phaseId, ... }
  projectId,
  phaseDeadline,        // YYYY-MM-DD
  projectDeadline,      // YYYY-MM-DD
  onUpdated,
}) {
  const dispatch = useDispatch();
  const { t } = useTranslation(["tasks", "messages", "errors"]);

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
      deadline: task?.deadline || "",
    },
  });

  const [sizeOptions, setSizeOptions] = useState(["S", "M", "L"]);
  const [members, setMembers] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");

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
          (Array.isArray(res) && res) || [];
        setMembers(list);
      } catch {
        setMembers([]);
      }
    })();
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    reset({
      name: task?.name || "",
      description: task?.description || "",
      size: task?.size || (sizeOptions.includes("M") ? "M" : sizeOptions[0]),
      assigneeId: task?.assigneeId ?? null,
      deadline: task?.deadline || "",
    });
    setAssigneeSearch("");
  }, [open, task, reset, sizeOptions]);

  // LUÔN gửi deadline trong payload
  const buildPayload = (values) => ({
    name: values.name?.trim(),
    description: values.description?.trim(),
    size: String(values.size).trim().toUpperCase(),
    assigneeId: values.assigneeId,
    deadline: values.deadline,
  });

  const combinedMax = useMemo(() => {
    const arr = [phaseDeadline, projectDeadline].filter(Boolean).sort();
    return arr[0];
  }, [phaseDeadline, projectDeadline]);

  const onSubmit = async (values) => {
    if (!task?.id) {
      dispatch(setPopup({ type: "error", message: "task-not-found" }));
      return;
    }

    // ✅ Chỉ chặn "quá khứ" nếu deadline BỊ ĐỔI
    const tStr = todayStr();
    const oldDl = task?.deadline || "";
    if (values.deadline < tStr && values.deadline !== oldDl) {
      dispatch(setPopup({ type: "error", message: t("deadline-cannot-be-in-the-past") }));
      return;
    }
    if (phaseDeadline && values.deadline > phaseDeadline) {
      dispatch(setPopup({ type: "error", message: t("deadline-cannot-be-after-phase-deadline") }));
      return;
    }
    if (projectDeadline && values.deadline > projectDeadline) {
      dispatch(setPopup({ type: "error", message: t("deadline-cannot-be-after-project-deadline") }));
      return;
    }

    const payload = buildPayload(values);

    try {
      const res = await updateTask(task.id, payload);
      if (res?.status === 200) {
        dispatch(setPopup({ type: "success", message: res.message || "task-updated" }));
        onUpdated?.(res.data);
        onClose?.();
      } else {
        dispatch(setPopup({ type: "error", message: res?.message || "server-is-busy" }));
      }
    } catch {
      dispatch(setPopup({ type: "error", message: "server-is-busy" }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("update-task", "Cập nhật Task")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("task-name", "Tên task")}
                fullWidth size="small"
                error={!!errors.name}
                helperText={errors.name && t(errors.name.message)}
                autoFocus
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("task-description", "Mô tả")}
                fullWidth multiline rows={3} size="small"
                error={!!errors.description}
                helperText={errors.description && t(errors.description.message)}
              />
            )}
          />

          <Controller
            name="size"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t("task-size", "Kích cỡ")}
                fullWidth size="small"
                error={!!errors.size}
                helperText={errors.size && t(errors.size.message)}
              >
                {sizeOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            )}
          />

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
                noOptionsText={t("no-options", "Không có dữ liệu")}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>
                        {`${option.firstName || ""} ${option.lastName || ""}`.trim() || "(No name)"}
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
                    label={t("assign-to", "Giao cho")}
                    size="small"
                    error={!!errors.assigneeId}
                    helperText={errors.assigneeId && t(errors.assigneeId.message)}
                  />
                )}
              />
            )}
          />

          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("task-deadline", "Hạn chót")}
                type="date"
                fullWidth size="small"
                error={!!errors.deadline}
                helperText={errors.deadline ? t(errors.deadline.message) : ""}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: todayStr(),               // vẫn giúp user không nhập quá khứ mới
                  max: combinedMax || undefined, // nhưng deadline cũ quá khứ vẫn giữ nguyên được
                }}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose}>{t("cancel", "Hủy")}</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {t("save-changes", "Lưu thay đổi")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
