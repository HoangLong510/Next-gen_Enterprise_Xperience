// src/components/project/form/CreateTaskDialog.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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

// ------- helpers -------
const todayStr = () => dayjs().format("YYYY-MM-DD");

const makeSchema = (allowedSizes = [], phaseDeadline, projectDeadline) =>
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
    size: yup
      .string()
      .required("size-is-required")
      .test("allowed-size", "invalid-size", (v) => !v || allowedSizes.includes(v)),
    deadline: yup
      .string()
      .required("deadline-is-required")
      .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
      .test("not-in-past", "deadline-before-today", (value) => !value || value >= todayStr())
      .test(
        "not-after-phase",
        "deadline-after-phase-deadline",
        (value) => !value || !phaseDeadline || value <= phaseDeadline
      )
      .test(
        "not-after-project",
        "deadline-after-project-deadline",
        (value) => !value || !projectDeadline || value <= projectDeadline
      ),
    assigneeId: yup.number().nullable().required("assignee-is-required"),
  });

export default function CreateTaskDialog({
  open,
  onClose,
  phase,              // { id, deadline, ... }
  projectDeadline,    // optional: YYYY-MM-DD
  onCreated,
  projectId,
}) {
  const dispatch = useDispatch();
  // 🔁 dùng namespace "task" (trùng tên file task.json)
  const { t: tTask } = useTranslation("task");
  const { t: tErrors } = useTranslation("errors");
  const { t: tMessages } = useTranslation("messages");

  const phaseDeadline = phase?.deadline || null;

  // sizes & members
  const [sizeOptions, setSizeOptions] = useState(["S", "M", "L"]);
  const [members, setMembers] = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  // dynamic schema (depends on sizes + deadlines)
  const schema = useMemo(
    () => makeSchema(sizeOptions, phaseDeadline, projectDeadline),
    [sizeOptions, phaseDeadline, projectDeadline]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      size: "M",
      deadline: todayStr(),
      assigneeId: null,
    },
  });

  const filter = createFilterOptions({
    stringify: (opt) =>
      `${opt.firstName || ""} ${opt.lastName || ""} ${opt.username || ""} ${opt.email || ""}`.toLowerCase(),
  });

  // Load sizes
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const sizes = await getTaskSizes();
        const list = Array.isArray(sizes) && sizes.length ? sizes : ["S", "M", "L"];
        setSizeOptions(list);
      } catch {
        setSizeOptions(["S", "M", "L"]);
      }
    })();
  }, [open]);

  // Load project members
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

  // Reset form when open (after sizes ready)
  useEffect(() => {
    if (!open) return;
    setAssigneeSearch("");
    reset({
      name: "",
      description: "",
      size: sizeOptions.includes("M") ? "M" : sizeOptions[0],
      deadline: todayStr(),
      assigneeId: null,
    });
  }, [open, reset, sizeOptions]);

  const onSubmit = async (data) => {
    if (!phase?.id) {
      dispatch(setPopup({ type: "error", message: "phase-not-found" }));
      return;
    }
    const res = await createTask({ ...data, phaseId: phase.id });
    if (res?.status === 200 || res?.status === 201) {
      dispatch(setPopup({ type: "success", message: res.message || "task-created-successfully" }));
      onCreated?.();
      onClose?.();
    } else {
      dispatch(setPopup({ type: "error", message: tErrors(res?.message) || res?.message || tMessages("server-is-busy") }));
    }
  };

  // deadline input bounds for UX (validation is in yup)
  const minDate = todayStr();
  const maxDate = useMemo(() => {
    const cands = [phaseDeadline, projectDeadline].filter(Boolean).sort();
    return cands.length ? cands[0] : undefined;
  }, [phaseDeadline, projectDeadline]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{tTask("create-task")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          {/* Task Name */}
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
                helperText={errors.name ? tErrors(errors.name.message) : ""}
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
                label={tTask("task-description")}
                fullWidth
                multiline
                rows={3}
                size="small"
                error={!!errors.description}
                helperText={errors.description ? tErrors(errors.description.message) : ""}
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
                label={tTask("task-size")}
                fullWidth
                size="small"
                error={!!errors.size}
                helperText={errors.size ? tErrors(errors.size.message) : ""}
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
                label={tTask("task-deadline")}
                type="date"
                fullWidth
                size="small"
                error={!!errors.deadline}
                helperText={errors.deadline ? tErrors(errors.deadline.message) : ""}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: minDate, max: maxDate }}
              />
            )}
          />

          {/* Assignee */}
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
                  const fullname = `${opt.firstName || ""} ${opt.lastName || ""}`.trim();
                  return opt.username || fullname || opt.email || "";
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
                    label={tTask("assign-to")}
                    size="small"
                    error={!!errors.assigneeId}
                    helperText={errors.assigneeId ? tErrors(errors.assigneeId.message) : ""}
                  />
                )}
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
          {tTask("create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
