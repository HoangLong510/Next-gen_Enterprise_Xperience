// src/components/project/form/UpdatePhaseDialog.jsx
"use client";

import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";
import { updatePhase } from "~/services/phase.service";
import { formatStatus } from "~/utils/project.utils";

// ===== Schema builder: check previous, tasks, next phase, project =====
const makeSchema = (projectDeadline, previousDeadline, maxTaskDeadline, nextPhaseDeadline) =>
  yup.object({
    name: yup.string().nullable().transform((v) => v ?? ""),
    deadline: yup
      .string()
      .nullable()
      .transform((v) => v ?? "")
      .matches(/^$|^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
      .test("not-before-previous", "deadline-before-previous-phase", (value) => {
        if (!value || !previousDeadline) return true;
        return value >= previousDeadline;
      })
      .test("not-before-tasks", "deadline-before-task-deadline", (value) => {
        if (!value || !maxTaskDeadline) return true;
        return value >= maxTaskDeadline;
      })
      .test("not-after-next-phase", "deadline-after-next-phase-deadline", (value) => {
        if (!value || !nextPhaseDeadline) return true;
        return value <= nextPhaseDeadline;
      })
      .test("not-after-project", "deadline-after-project-deadline", (value) => {
        if (!value || !projectDeadline) return true;
        return value <= projectDeadline;
      }),
    status: yup.string().nullable(),
  });

// ===== Helpers =====
const countIncomplete = (tasks = []) =>
  tasks.filter((t) => t.status !== "CANCELED" && t.status !== "COMPLETED").length;

export default function UpdatePhaseDialog({
  open,
  onClose,
  phase,                // PhaseDto (có tasks)
  projectDeadline,      // YYYY-MM-DD
  previousDeadline,     // YYYY-MM-DD
  nextPhaseStatus,      // trạng thái phase kế tiếp (để xét reopen)
  nextPhaseDeadline,    // YYYY-MM-DD (deadline của phase kế tiếp, nếu có)
  onUpdated,
}) {
  const dispatch = useDispatch();
  const { t: tPhases } = useTranslation("phases");
  const { t: tMessages } = useTranslation("messages");
  const { t: tErrors } = useTranslation("errors");

  // Max deadline của các task trong phase (bỏ qua CANCELED)
  const maxTaskDeadline = useMemo(() => {
    if (!Array.isArray(phase?.tasks) || phase.tasks.length === 0) return null;
    let max = null;
    for (const t of phase.tasks) {
      if (!t?.deadline) continue;
      if (t.status === "CANCELED") continue;
      const d = dayjs(t.deadline, "YYYY-MM-DD");
      if (!max || d.isAfter(max, "day")) max = d;
    }
    return max ? max.format("YYYY-MM-DD") : null;
  }, [phase?.tasks]);

  const schema = useMemo(
    () => makeSchema(projectDeadline, previousDeadline, maxTaskDeadline, nextPhaseDeadline),
    [projectDeadline, previousDeadline, maxTaskDeadline, nextPhaseDeadline]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: phase?.name ?? "",
      deadline: phase?.deadline ?? "",
      status: phase?.status ?? "",
    },
  });

  // Theo dõi deadline đang nhập (nếu cần re-render helper)
  useWatch({ control, name: "deadline" });

  useEffect(() => {
    if (open && phase) {
      reset({
        name: phase.name ?? "",
        deadline: phase.deadline ?? "",
        status: phase.status ?? "",
      });
    }
  }, [open, phase, reset]);

  const incompleteCount = useMemo(() => countIncomplete(phase?.tasks), [phase?.tasks]);

  // ==== REOPEN RULE (COMPLETED -> IN_PROGRESS) ====
  const today = dayjs().startOf("day");
  const effectiveDeadlineStr = phase?.deadline || "";
  const effectiveDeadlineOk =
    !effectiveDeadlineStr ||
    dayjs(effectiveDeadlineStr, "YYYY-MM-DD").isSame(today) ||
    dayjs(effectiveDeadlineStr, "YYYY-MM-DD").isAfter(today);

  const nextPhaseOk = !nextPhaseStatus || nextPhaseStatus === "PLANNING";
  const canReopenFromCompleted = effectiveDeadlineOk && nextPhaseOk;

  // ==== DISABLE MAP ====
  const disabledMap = useMemo(() => {
    const cur = phase?.status;
    const map = { PLANNING: false, IN_PROGRESS: false, COMPLETED: false };
    if (!cur) return map;

    if (cur === "PLANNING") {
      if (!Array.isArray(phase?.tasks) || phase.tasks.length === 0) map.IN_PROGRESS = true; // cần có task
      map.COMPLETED = true;
    }

    if (cur === "IN_PROGRESS") {
      if (Array.isArray(phase?.tasks) && phase.tasks.length > 0) map.PLANNING = true; // không lùi khi đã có task
      if (incompleteCount > 0) map.COMPLETED = true; // chưa xong task thì không completed
    }

    if (cur === "COMPLETED") {
      map.PLANNING = true; // không quay về planning
      map.IN_PROGRESS = !canReopenFromCompleted; // chỉ cho reopen khi thoả điều kiện
      map.COMPLETED = false;
    }

    return map;
  }, [phase?.status, phase?.tasks, incompleteCount, canReopenFromCompleted]);

  // ===== Guard runtime khi user THỰC SỰ đổi deadline =====
  const validateDeadlineOnSubmitIfChanged = (values) => {
    const initial = phase?.deadline || "";
    const next = values.deadline || "";
    const changed = next !== initial;

    if (!changed) return true;

    // Sàn = max(today, previousDeadline, maxTaskDeadline)
    const todayStr = today.format("YYYY-MM-DD");
    const minCandidates = [todayStr, previousDeadline, maxTaskDeadline].filter(Boolean).sort();
    const minStr = minCandidates[minCandidates.length - 1] || todayStr;

    // Trần = min(projectDeadline, nextPhaseDeadline)
    const maxCandidates = [projectDeadline, nextPhaseDeadline].filter(Boolean).sort();
    const maxStr = maxCandidates.length ? maxCandidates[0] : null;

    if (next && next < minStr) {
      const msgKey =
        maxTaskDeadline && next < maxTaskDeadline
          ? "deadline-before-task-deadline"
          : "deadline-cannot-be-in-the-past";
      dispatch(
        setPopup({
          type: "error",
          message: tErrors(msgKey) || tMessages(msgKey) || "Invalid deadline",
        })
      );
      return false;
    }

    if (maxStr && next > maxStr) {
      const msgKey =
        nextPhaseDeadline && next > nextPhaseDeadline
          ? "deadline-after-next-phase-deadline"
          : "deadline-after-project-deadline";
      dispatch(
        setPopup({
          type: "error",
          message: tErrors(msgKey) || tMessages(msgKey) || "Invalid deadline",
        })
      );
      return false;
    }

    return true;
  };

  // ==== SUBMIT ====
  const doSubmit = async (payload) => {
    const res = await updatePhase(phase.id, payload);
    if (res.status === 200) {
      dispatch(
        setPopup({
          type: "success",
          message:
            tMessages(res.message) ||
            tErrors(res.message) ||
            res.message ||
            tMessages("updated-successfully"),
        })
      );
      onUpdated?.();
      onClose?.();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message:
            tErrors(res.message) || tMessages(res.message) || res.message || tMessages("server-is-busy"),
        })
      );
    }
  };

  const onSubmit = async (values) => {
    if (!validateDeadlineOnSubmitIfChanged(values)) return;

    const payload = {};
    if (values.name !== phase.name) payload.name = values.name;

    const deadlineChanged = (values.deadline || "") !== (phase.deadline || "");
    if (phase.status !== "COMPLETED" && deadlineChanged && values.deadline) {
      payload.deadline = values.deadline;
    }

    if (values.status && values.status !== phase.status) payload.status = values.status;

    if (Object.keys(payload).length === 0) {
      onClose?.();
      return;
    }

    await doSubmit(payload);
  };

  // ===== UI =====
  // Sàn hiển thị: max(today, previousDeadline, maxTaskDeadline)
  const minDateStr = (() => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const arr = [todayStr, previousDeadline, maxTaskDeadline].filter(Boolean).sort();
    return arr[arr.length - 1] || todayStr;
  })();

  // Trần hiển thị: min(projectDeadline, nextPhaseDeadline)
  const maxDateStr = (() => {
    const arr = [projectDeadline, nextPhaseDeadline].filter(Boolean).sort();
    return arr.length ? arr[0] : undefined;
  })();

  const isCompleted = phase?.status === "COMPLETED";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{tPhases("update-phase") || "Update Phase"}</DialogTitle>

      <DialogContent>
        <Stack spacing={3} mt={1}>
          {/* Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={tPhases("phase-name")}
                fullWidth
                size="small"
                error={!!errors.name}
                helperText={errors.name ? tErrors(errors.name?.message) || errors.name?.message : ""}
                autoFocus
              />
            )}
          />

          {/* Deadline (disable khi COMPLETED) */}
          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={tPhases("phase-deadline")}
                type="date"
                fullWidth
                size="small"
                error={!!errors.deadline}
                helperText={
                  isCompleted
                    ? tMessages("deadline-locked-when-completed") ||
                      "Phase has been completed. Deadline is locked."
                    : errors.deadline
                    ? tErrors(errors.deadline?.message) || errors.deadline?.message
                    : ""
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: minDateStr,
                  max: maxDateStr,
                  readOnly: isCompleted,
                }}
                disabled={isCompleted}
              />
            )}
          />

          {/* Status */}
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <FormControl size="small" fullWidth>
                <InputLabel>{tPhases("phase-status") || "Phase Status"}</InputLabel>
                <Select {...field} label={tPhases("phase-status") || "Phase Status"}>
                  {["PLANNING", "IN_PROGRESS", "COMPLETED"].map((s) => (
                    <MenuItem key={s} value={s} disabled={disabledMap[s]}>
                      {formatStatus(s)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          {/* Hint khi đang IN_PROGRESS mà còn việc chưa xong */}
          {phase?.status === "IN_PROGRESS" && incompleteCount > 0 && (
            <Typography variant="caption" color="error.main">
              {tMessages("phase-has-unfinished-tasks", { count: incompleteCount }) ||
                `Còn ${incompleteCount} công việc chưa hoàn thành (không tính công việc đã hủy), nên không thể đặt phase thành Completed.`}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{tPhases("cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          {tPhases("update") || "Update"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
