// ~/components/ProjectForm.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  Typography,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";
import { createProjectFromDocument } from "~/services/project.service";
import dayjs from "dayjs";

const schema = yup.object({
  name: yup.string().required("Project name is required").min(3).max(100),
  description: yup
    .string()
    .required("Description is required")
    .min(10)
    .max(1000),
  priority: yup
    .string()
    .required("Priority is required")
    .oneOf(["LOW", "MEDIUM", "HIGH"]),
  deadline: yup
    .date()
    .required("Deadline is required")
    .min(dayjs().toDate(), "Deadline must be today or later"),
});

const defaultValues = {
  name: "",
  description: "",
  priority: "MEDIUM",
  deadline: dayjs().add(7, "day").format("YYYY-MM-DD"), // mặc định 7 ngày nữa
};

export default function ProjectFormCreate({
  open,
  onClose,
  onSubmit,
  initialData = null,
  documentId,
  document,
  pmName,
}) {
  const {
  control,
  handleSubmit,
  reset,
  formState: { errors },
} = useForm({
  resolver: yupResolver(schema),
  defaultValues, // dùng defaultValues, nhưng luôn reset lại bên dưới
});

useEffect(() => {
  if (document) {
    reset({
      name: document.projectName || "",
      description: document.projectDescription || "",
      priority: document.projectPriority || "MEDIUM",
      deadline: document.projectDeadline
        ? dayjs(document.projectDeadline).format("YYYY-MM-DD")
        : dayjs().add(7, "day").format("YYYY-MM-DD"),
      note: "",
    });
  } else if (initialData) {
    reset({ ...defaultValues, ...initialData });
  } else {
    reset(defaultValues);
  }
}, [document, open]);


  const deadlineValue = document?.projectDeadline
    ? dayjs(document.projectDeadline).format("YYYY-MM-DD")
    : "";

  const handleFormSubmit = async (data) => {
    const payload = {
      ...data,
      documentId,
    };
    const res = await createProjectFromDocument(payload);

    if (res.status === 200) {
      onSubmit?.(); // reload nếu truyền vào
      onClose();
    } else {
      alert(res.message || "Failed to create project");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography fontWeight={600}>Create Project from Document</Typography>
      </DialogTitle>

        <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            📌 Project Manager:{" "}
            <strong>{pmName || document?.pmName || ""}</strong>
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

          {/* Ghi chú (optional) */}
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Note (optional)"
                fullWidth
                size="small"
                multiline
                rows={2}
                error={!!errors.note}
                helperText={errors.note?.message}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          sx={{ bgcolor: "#118D57" }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
