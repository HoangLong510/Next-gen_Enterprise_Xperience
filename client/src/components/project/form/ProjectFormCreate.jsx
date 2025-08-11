import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";
import { createProjectFromDocument } from "~/services/project.service";
import dayjs from "dayjs";

const schema = yup.object({
  name: yup.string().required("Project name is required").min(3).max(100),
  description: yup.string().required("Description is required").min(10).max(1000),
  deadline: yup
    .string()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
    .test("not-in-past", "deadline-cannot-be-in-the-past", (value) => {
      if (!value) return true;
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const localToday = `${year}-${month}-${day}`;
      return value >= localToday;
    }),
  // Cho phép có priority nhưng không bắt buộc (để không vướng validate)
  priority: yup.string().nullable().notRequired(),
});

const defaultValues = {
  name: "",
  description: "",
  deadline: dayjs().add(7, "day").format("YYYY-MM-DD"),
  priority: "MEDIUM",
};

export default function ProjectFormCreate({
  open,
  onClose,
  onSubmit,
  initialData = null,
  document,
  documentId,
  pmName,
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const localToday = `${year}-${month}-${day}`;

    if (document) {
      let data = {
        name: document.projectName || "",
        description: document.projectDescription || "",
        priority: document.projectPriority ?? "MEDIUM",
        deadline: document.projectDeadline
          ? dayjs(document.projectDeadline).format("YYYY-MM-DD")
          : dayjs().add(7, "day").format("YYYY-MM-DD"),
      };
      if (data.deadline && data.deadline < localToday) {
        data = { ...data, deadline: localToday };
      }
      reset(data);
    } else if (initialData) {
      let deadline =
        initialData.deadline ?? dayjs().add(7, "day").format("YYYY-MM-DD");
      if (deadline && deadline < localToday) {
        deadline = localToday;
      }
      reset({ ...defaultValues, ...initialData, deadline });
    } else {
      reset(defaultValues);
    }
  }, [document, initialData, open, reset]);

  const dispatch = useDispatch();
  const { t } = useTranslation("messages");

  const handleFormSubmit = async (data) => {
    const payload = { ...data, documentId };
    const res = await createProjectFromDocument(payload);

    if (res?.status === 200 || res?.status === 201) {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "project-created-successfully",
        })
      );
      onSubmit?.();
      onClose();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res?.message || "create-project-failed",
        })
      );
    }
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const localToday = `${year}-${month}-${day}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography fontWeight={600}>Create Project from Document</Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            📌 Project Manager: <strong>{pmName || document?.pmName || ""}</strong>
          </Typography>

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Project Name"
                fullWidth
                size="small"
                disabled
                error={!!errors.name}
                helperText={errors.name?.message}
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
                fullWidth
                size="small"
                multiline
                rows={3}
                disabled
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />

          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Deadline"
                type="date"
                fullWidth
                size="small"
                disabled
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: localToday }}
                error={!!errors.deadline}
                helperText={errors.deadline?.message}
              />
            )}
          />

          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Priority"
                fullWidth
                size="small"
                disabled
                error={!!errors.priority}
                helperText={errors.priority?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit(handleFormSubmit)} variant="contained" sx={{ bgcolor: "#118D57" }}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
