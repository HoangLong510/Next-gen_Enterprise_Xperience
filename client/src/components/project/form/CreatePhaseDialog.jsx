"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";
import { createPhase } from "~/services/phase.service";

const schema = yup.object({
  name: yup
    .string()
    .required("phase-name-is-required")
    .min(3, "phase-name-must-be-at-least-3-characters")
    .max(100, "phase-name-must-be-at-most-100-characters"),
  deadline: yup
    .string()
    .required("deadline-is-required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
    .test("not-before-today", "deadline-before-today", (value) => {
      if (!value) return false;
      return value >= dayjs().format("YYYY-MM-DD");
    })
    .test("not-before-previous", "deadline-before-previous-phase", function (value) {
      const ctx = this?.options?.context ?? {};
      const prevDd = ctx.previousDeadline;
      if (!prevDd) return true;
      return value >= prevDd;
    })
    .test("not-after-project", "deadline-after-project-deadline", function (value) {
      const ctx = this?.options?.context ?? {};
      const projDd = ctx.projectDeadline;
      if (!projDd) return true;
      return value <= projDd;
    }),
});

export default function CreatePhaseDialog({
  open,
  onClose,
  projectDeadline,
  previousDeadline,
  projectId,
  onCreated,
}) {
  const dispatch = useDispatch();

  // Tách từng namespace để tránh lẫn key
  const { t: tPhases } = useTranslation("phases");
  const { t: tMessages } = useTranslation("messages");
  const { t: tErrors } = useTranslation("errors");

  const today = dayjs().format("YYYY-MM-DD");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema, { context: { projectDeadline, previousDeadline } }),
    defaultValues: {
      name: "",
      deadline: previousDeadline || today,
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: "", deadline: previousDeadline || today });
    }
  }, [open, previousDeadline, today, reset]);

  const onSubmit = async (data) => {
    const res = await createPhase(projectId, data);
    if (res.status === 200 || res.status === 201) {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || tMessages("phase-created-successfully"),
        })
      );
      onCreated?.();
      onClose();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || tMessages("server-is-busy"),
        })
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{tPhases("create-phase")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} mt={1}>
          {/* Tên Phase */}
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
                helperText={
                  errors.name
                    ? tErrors(errors.name?.message) || tMessages(errors.name?.message)
                    : ""
                }
                autoFocus
              />
            )}
          />
          {/* Deadline */}
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
                  errors.deadline
                    ? tErrors(errors.deadline?.message) || tMessages(errors.deadline?.message)
                    : ""
                }
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: previousDeadline || today,
                  max: projectDeadline,
                }}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{tPhases("cancel")}</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          {tPhases("create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
