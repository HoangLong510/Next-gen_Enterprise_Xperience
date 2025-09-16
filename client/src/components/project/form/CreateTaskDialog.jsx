"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
} from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";
import { createTask, getTaskSizes } from "~/services/task.service";
import { getProjectEmployees } from "~/services/project-employee.service";

const schema = yup.object({
  name: yup
    .string()
    .required("task-name-is-required")
    .min(3, "task-name-must-be-at-least-3-characters")
    .max(100, "task-name-must-be-at-most-100-characters"),
  description: yup
    .string()
    .required("task-description-is-required")
    .min(5, "task-description-must-be-at-least-5-characters")
    .max(1000, "task-description-must-be-at-most-1000-characters"),
  size: yup
    .string()
    .required("size-is-required")
    .oneOf(["S", "M", "L"], "invalid-size"),
  deadline: yup
    .string()
    .required("deadline-is-required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
    .test("not-in-past", "deadline-before-today", (value) => value >= dayjs().format("YYYY-MM-DD"))
    .test("not-after-phase", "deadline-after-phase-deadline", (value, ctx) => {
      const { phaseDeadline } = ctx.options.context || {};
      return !phaseDeadline || value <= phaseDeadline;
    })
    .test("not-after-project", "deadline-after-project-deadline", (value, ctx) => {
      const { projectDeadline } = ctx.options.context || {};
      return !projectDeadline || value <= projectDeadline;
    }),
  assigneeId: yup.number().nullable().required("assignee-is-required"),
});

export default function CreateTaskDialog({
  open,
  onClose,
  phase,
  projectDeadline,
  onCreated,
  projectId,
}) {
  const dispatch = useDispatch();
  const { t } = useTranslation(["tasks", "messages", "errors"]);
  const today = dayjs().format("YYYY-MM-DD");
  const phaseDeadline = phase?.deadline;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema, { context: { phaseDeadline, projectDeadline } }),
    defaultValues: {
      name: "",
      description: "",
      size: "M",
      deadline: today,
      assigneeId: null,
    },
  });

  const [sizeOptions, setSizeOptions] = useState(["S", "M", "L"]);
  const [members, setMembers] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const filter = createFilterOptions({
    stringify: (opt) =>
      `${opt.firstName || ""} ${opt.lastName || ""} ${opt.username || ""} ${opt.email || ""}`.toLowerCase(),
  });

  // Task sizes
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

  // Project members (only those already added into project)
  useEffect(() => {
    if (!open || !projectId) return;
    (async () => {
      try {
        const res = await getProjectEmployees(projectId);
        // Hỗ trợ cả hai kiểu trả về: axios response hoặc data đã unwrap
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

  // Reset khi mở dialog
  useEffect(() => {
    if (!open) return;
    setAssigneeSearch("");
    reset({
      name: "",
      description: "",
      size: sizeOptions.includes("M") ? "M" : sizeOptions[0],
      deadline: today,
      assigneeId: null,
    });
  }, [open, reset, today, sizeOptions]);

  const onSubmit = async (data) => {
    if (!phase?.id) {
      dispatch(setPopup({ type: "error", message: "phase-not-found" }));
      return;
    }
    const res = await createTask({ ...data, phaseId: phase.id });
    if (res.status === 200 || res.status === 201) {
      dispatch(setPopup({ type: "success", message: res.message || "task-created-successfully" }));
      onCreated?.();
      onClose();
    } else {
      dispatch(setPopup({ type: "error", message: res.message || "server-is-busy" }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("create-task")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          {/* Task Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("task-name")}
                fullWidth
                size="small"
                error={!!errors.name}
                helperText={t(errors.name?.message)}
                autoFocus
              />
            )}
          />

          {/* Task Description */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("task-description")}
                fullWidth
                multiline
                rows={3}
                size="small"
                error={!!errors.description}
                helperText={t(errors.description?.message)}
              />
            )}
          />

          {/* Task Size */}
          <Controller
            name="size"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t("task-size")}
                fullWidth
                size="small"
                error={!!errors.size}
                helperText={t(errors.size?.message || "")}
              >
                {sizeOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Deadline */}
          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t("task-deadline")}
                type="date"
                fullWidth
                size="small"
                error={!!errors.deadline}
                helperText={t(errors.deadline?.message)}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: today,
                  max: phaseDeadline || projectDeadline,
                }}
              />
            )}
          />

          {/* Assign Employee (with search + name & username) */}
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
                  return opt.username || `${opt.firstName || ""} ${opt.lastName || ""}`.trim() || opt.email || "";
                }}
                isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                noOptionsText="No options"
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
                    label={t("assign-to")}
                    size="small"
                    error={!!errors.assigneeId}
                    helperText={errors.assigneeId && t(errors.assigneeId.message)}
                  />
                )}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose}>{t("cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          {t("create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
