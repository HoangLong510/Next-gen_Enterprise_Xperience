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
} from "@mui/material"
import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import { updateProject } from "~/services/project.service"

const schema = yup.object({
  name: yup.string().required("project-name-is-required").min(3).max(100),
  description: yup.string().required("description-is-required").min(10).max(1000),
  priority: yup.string().required("priority-is-required").oneOf(["LOW", "MEDIUM", "HIGH"]),
  status: yup
  .string()
  .required("status-is-required")
  .oneOf(["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELED"]),
  deadline: yup
  .string()
  .nullable()
  .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
  .test("not-in-past", "deadline-cannot-be-in-the-past", (value) => {
    if (!value) return true;
    const todayStr = new Date().toISOString().slice(0, 10);
    return value >= todayStr;
  }),
  pmName: yup.string().required("pm-name-is-required"),
  documentId: yup.number().required("document-id-is-required").typeError("document-id-must-be-a-number"),
})

const defaultValues = {
  name: "",
  description: "",
  priority: "MEDIUM",
  status: "PLANNING",
  deadline: "",
  pmName: "",
  documentId: null,
}

export default function ProjectForm({ open, onClose, initialData = null, onSubmit }) {
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (initialData) {
      const clean = Object.fromEntries(
        Object.entries({ ...defaultValues, ...initialData }).map(([key, value]) => [
          key,
          value == null ? (key === "documentId" ? 0 : "") : value,
        ])
      )

      // Tách document nếu dùng dạng { document: { id, code } }
      clean.documentId = initialData?.document?.id ?? initialData?.documentId ?? 0
      clean.documentCode = initialData?.document?.code ?? initialData?.documentCode ?? "Mã không xác định"

      reset(clean)
    } else {
      reset(defaultValues)
    }
  }, [initialData, reset])

const handleFormSubmit = async (data) => {
  console.log("📦 Dữ liệu gửi lên:", data);
  console.log("📌 initialData:", initialData);

  if (!initialData?.id) {
    alert("❌ Không có ID để cập nhật project");
    return;
  }

  try {
    const res = await updateProject(initialData.id, data);
    console.log("✅ Phản hồi từ API:", res);

    // Trường hợp backend trả về lỗi dạng { errors: { field: message } }
    if (res?.errors) {
      Object.entries(res.errors).forEach(([field, message]) => {
        setError(field, {
          type: "manual",
          message,
        });
      });
      return;
    }

    // Nếu API trả về null hoặc object hợp lệ
    if (res !== null && typeof res === "object") {
      onSubmit?.();
      onClose();
    } else {
      alert("❌ Cập nhật thất bại! Server không trả về thông tin project.");
    }
  } catch (err) {
    console.error("🚨 Lỗi khi gọi updateProject:", err);
    alert("Có lỗi khi cập nhật. Vui lòng thử lại sau.");
  }
};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography fontWeight={600}>
          Update Project
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} mt={1}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Project Name" size="small" fullWidth error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }} />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Description" multiline rows={3} size="small" fullWidth error={!!errors.description} helperText={errors.description?.message} InputLabelProps={{ shrink: true }} />
            )}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Priority" size="small" fullWidth error={!!errors.priority} helperText={errors.priority?.message}>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Status" size="small" fullWidth error={!!errors.status} helperText={errors.status?.message}>
<MenuItem value="PLANNING">Planning</MenuItem>
<MenuItem value="IN_PROGRESS">In Progress</MenuItem>
<MenuItem value="COMPLETED">Completed</MenuItem>
<MenuItem value="CANCELED">Canceled</MenuItem>
                </TextField>
              )}
            />
          </Stack>

          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <TextField {...field} type="date" label="Deadline" size="small" fullWidth error={!!errors.deadline} helperText={errors.deadline?.message} InputLabelProps={{ shrink: true }} />
            )}
          />

          {/* ✅ Hiển thị documentCode dạng read-only */}
          <TextField
            value={initialData?.document?.id ?? initialData?.documentId ?? "Mã không xác định"}
            label="Document Id"
            size="small"
            fullWidth
            disabled
            InputLabelProps={{ shrink: true }}
          />

          {/* ✅ documentId dùng để submit nhưng không hiển thị cho người dùng */}
          <Controller
            name="documentId"
            control={control}
            render={({ field }) => <input type="hidden" {...field} />}
          />

          <Controller
            name="pmName"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="PM Name" size="small" fullWidth error={!!errors.pmName} helperText={errors.pmName?.message} InputLabelProps={{ shrink: true }} />
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
  )
}