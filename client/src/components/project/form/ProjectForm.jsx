// src/components/project/form/ProjectForm.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Button,
  MenuItem,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import { updateProject } from "~/services/project.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";

const defaultValues = {
  name: "",
  description: "",
  status: "PLANNING",
  deadline: "",
  pmName: "",
  documentId: null,
};

export default function ProjectForm({
  open,
  onClose,
  initialData = null,
  onSuccess,
  // deadline nhỏ nhất cho phép = max(deadline của phase & task)
  minAllowedDeadline, // string YYYY-MM-DD | null
}) {
  const dispatch = useDispatch();
  const { t } = useTranslation("popup");
  const { t: tMsg } = useTranslation("messages");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const lastStatusRef = useRef(null);

  // ❗ BỎ test "not-in-past" – chỉ check khi submit nếu deadline bị đổi
  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required("project-name-is-required").min(3).max(100),
        description: yup.string().required("description-is-required").min(10).max(1000),
        status: yup
          .string()
          .required("status-is-required")
          .oneOf(["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELED"]),
        deadline: yup
          .string()
          .nullable()
          .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
          .test(
            "not-before-children",
            "project-deadline-cannot-be-earlier-than-existing-phases-or-tasks",
            (value) => {
              if (!value || !minAllowedDeadline) return true;
              const vv = dayjs(value, "YYYY-MM-DD");
              const mm = dayjs(minAllowedDeadline, "YYYY-MM-DD");
              return vv.isSame(mm, "day") || vv.isAfter(mm, "day");
            }
          ),
        pmName: yup.string().required("pm-name-is-required"),
        documentId: yup
          .number()
          .required("document-id-is-required")
          .typeError("document-id-must-be-a-number"),
      }),
    [minAllowedDeadline]
  );

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema), defaultValues });

  useEffect(() => {
    if (initialData) {
      const deadline = initialData.deadline ?? "";
      const clean = Object.fromEntries(
        Object.entries({ ...defaultValues, ...initialData }).map(([key, value]) => [
          key,
          key === "deadline" ? deadline : value == null ? (key === "documentId" ? 0 : "") : value,
        ])
      );
      clean.documentId = initialData?.document?.id ?? initialData?.documentId ?? 0;
      clean.documentCode = initialData?.document?.code ?? initialData?.documentCode ?? "Mã không xác định";
      reset(clean);
    } else {
      reset(defaultValues);
    }
  }, [initialData, reset]);

  const totalTask = initialData?.totalTask ?? 0;
  const doneTask = initialData?.doneTask ?? 0;
  const hasTasks = totalTask > 0;
  const canComplete = hasTasks && doneTask === totalTask;

  const doSubmit = async (payload) => {
    try {
      const res = await updateProject(initialData.id, payload);

      if (res?.errors) {
        Object.entries(res.errors).forEach(([field, message]) => {
          setError(field, { type: "manual", message });
        });
        dispatch(setPopup({ type: "error", message: res.message || "validation-errors" }));
        return;
      }

      if (res?.status === 200 || res?.status === 201) {
        dispatch(setPopup({ type: "success", message: res.message || "project-updated-successfully" }));
        onSuccess?.();
        onClose();
      } else {
        dispatch(setPopup({ type: "error", message: res.message || "server-is-busy" }));
      }
    } catch (err) {
      console.error(err);
      dispatch(setPopup({ type: "error", message: "server-is-busy" }));
    }
  };

  const handleFormSubmit = async (data) => {
    if (!initialData?.id) {
      dispatch(setPopup({ type: "error", message: "project-not-found" }));
      return;
    }

    const payload = {
      name: data.name,
      description: data.description,
      deadline: data.deadline,
      status: data.status,
    };

    // ✅ Chỉ chặn "deadline ở quá khứ" nếu NGƯỜI DÙNG ĐÃ ĐỔI deadline
    const oldDl = initialData?.deadline || "";
    const newDl = data.deadline || "";
    if (newDl && newDl !== oldDl) {
      const today = dayjs().startOf("day");
      const vv = dayjs(newDl, "YYYY-MM-DD");
      if (vv.isBefore(today, "day")) {
        setError("deadline", { type: "manual", message: "deadline-cannot-be-in-the-past" });
        dispatch(setPopup({ type: "error", message: tMsg("deadline-cannot-be-in-the-past") }));
        return;
      }
    }

    // Nếu đổi sang CANCELED -> confirm
    if (payload.status === "CANCELED" && initialData?.status !== "CANCELED") {
      setPendingPayload(payload);
      setConfirmOpen(true);
      return;
    }

    await doSubmit(payload);
  };

  const today = dayjs().format("YYYY-MM-DD");
  const minDatePicker = useMemo(() => {
    if (!minAllowedDeadline) return today;
    const m = dayjs(minAllowedDeadline, "YYYY-MM-DD");
    return m.isAfter(dayjs(today)) ? m.format("YYYY-MM-DD") : today;
  }, [minAllowedDeadline, today]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography fontWeight={600}>Update Project</Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} mt={1}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Project Name"
                  size="small"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  multiline
                  rows={3}
                  size="small"
                  fullWidth
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => {
                const handleChangeStatus = (e) => {
                  const next = e.target.value;
                  if (next === "PLANNING" && hasTasks) return;
                  if (next === "COMPLETED" && !canComplete) return;
                  field.onChange(next);
                };

                return (
                  <TextField
                    value={field.value}
                    onChange={handleChangeStatus}
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    error={!!errors.status}
                    helperText={
                      (errors.status ? tMsg(errors.status.message) : undefined) ||
                      (hasTasks && field.value === "PLANNING" ? "Không thể về Planning khi đã có task" : "") ||
                      (!canComplete && field.value === "COMPLETED" ? "Chưa thể Completed vì còn task chưa xong" : "")
                    }
                  >
                    <MenuItem value="PLANNING" disabled={hasTasks}>
                      Planning
                    </MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="COMPLETED" disabled={!canComplete}>
                      Completed
                    </MenuItem>
                    <MenuItem value="CANCELED">Canceled</MenuItem>
                  </TextField>
                );
              }}
            />

            <Controller
              name="deadline"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Deadline"
                  size="small"
                  fullWidth
                  error={!!errors.deadline}
                  helperText={
                    errors.deadline
                      ? tMsg(errors.deadline.message)
                      : (minAllowedDeadline
                          ? `Minimum allowed: ${minAllowedDeadline}`
                          : undefined)
                  }
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: minDatePicker }}
                />
              )}
            />

            <TextField
              value={initialData?.document?.code ?? initialData?.documentCode ?? "Mã không xác định"}
              label="Document Code"
              size="small"
              fullWidth
              disabled
              InputLabelProps={{ shrink: true }}
            />

            <Controller name="documentId" control={control} render={({ field }) => <input type="hidden" {...field} />} />

            <Controller
              name="pmName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="PM Name"
                  size="small"
                  fullWidth
                  disabled
                  InputProps={{ readOnly: true }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit(handleFormSubmit)} variant="contained" sx={{ bgcolor: "#118D57", textTransform: "capitalize" }}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm chỉ bật khi bấm Update và status -> CANCELED */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t("confirm")}</DialogTitle>
        <DialogContent>
          <Typography>{tMsg("confirm-cancel-project-message")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined" color="inherit">
            {t("close")}
          </Button>
          <Button
            onClick={async () => {
              setConfirmOpen(false);
              setValue("status", "CANCELED", { shouldValidate: true, shouldDirty: true });
              if (pendingPayload) {
                await doSubmit(pendingPayload);
                setPendingPayload(null);
              }
            }}
            variant="contained"
            color="error"
          >
            {t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
