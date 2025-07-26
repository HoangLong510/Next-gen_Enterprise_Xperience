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
  name: yup
    .string()
    .required("Project name is required")
    .min(3)
    .max(100),
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
    if (initialData) {
      reset({ ...defaultValues, ...initialData });
    } else {
      reset(defaultValues);
    }
  }, [initialData, reset]);

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
        <Typography fontWeight={600}>
          Create Project from Document
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} mt={1}>
          {pmName && (
            <Typography variant="body2" color="text.secondary">
              📌 Project Manager: <strong>{pmName}</strong>
            </Typography>
          )}

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Project Name"
                fullWidth
                size="small"
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
                multiline
                rows={3}
                size="small"
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
                error={!!errors.deadline}
                helperText={errors.deadline?.message}
                InputLabelProps={{ shrink: true }}
              />
            )}
          />

          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Priority"
                fullWidth
                size="small"
                error={!!errors.priority}
                helperText={errors.priority?.message}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
              </TextField>
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