import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
  Fade,
  Backdrop,
  Grid,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect, useState } from "react";
import { createDocumentApi } from "~/services/document.service";
import { fetchPMsApi } from "~/services/account.service";

// -------- VALIDATION --------
const schema = yup.object().shape({
  title: yup.string().required("Please enter the title"),
  content: yup.string().required("Please enter the content"),
  type: yup.string().required("Please select document type"),
  projectManagerId: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: s => s.required("Select Project Manager"),
      otherwise: s => s.nullable(),
    }),
  projectName: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: s => s.required("Project name is required").min(3).max(100),
      otherwise: s => s.nullable(),
    }),
  projectDescription: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: s => s.required("Description is required").min(10).max(1000),
      otherwise: s => s.nullable(),
    }),
  projectDeadline: yup
    .date()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: s =>
        s
          .required("Deadline is required")
          .min(new Date(), "Deadline must be today or later"),
      otherwise: s => s.nullable(),
    }),
  projectPriority: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: s =>
        s
          .required("Priority is required")
          .oneOf(["LOW", "MEDIUM", "HIGH"], "Select valid priority"),
      otherwise: s => s.nullable(),
    }),
});

export default function DocumentCreate({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [pmList, setPmList] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      type: "",
      projectManagerId: null,
      projectName: "",
      projectDescription: "",
      projectDeadline: "",
      projectPriority: "",
    },
  });

  const type = watch("type");
  const projectManagerId = watch("projectManagerId");

  // Fetch PM list
  useEffect(() => {
    if (type === "PROJECT") {
      async function fetchPMs() {
        const token = localStorage.getItem("accessToken");
        const res = await fetchPMsApi(token);
        setPmList(res.status === 200 ? res.data : []);
      }
      fetchPMs();
    }
  }, [type]);

  // Submit handler
  const onSubmit = async (data) => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    const payload = {
      title: data.title,
      content: data.content,
      type: data.type,
      receiverId: data.type === "PROJECT" ? data.projectManagerId : null,
      pmId: data.type === "PROJECT" ? data.projectManagerId : null, // Dự phòng cho BE nếu cần
      projectName: data.type === "PROJECT" ? data.projectName : null,
      projectDescription:
        data.type === "PROJECT" ? data.projectDescription : null,
      projectDeadline: data.type === "PROJECT" ? data.projectDeadline : null,
      projectPriority: data.type === "PROJECT" ? data.projectPriority : null,
    };
    const res = await createDocumentApi(payload, token);
    setLoading(false);

    if (res.status === 201) {
      onSuccess && onSuccess(res.data);
      reset();
    } else {
      setError("title", {
        type: "manual",
        message: res.message || "Create document failed",
      });
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 540,
        bgcolor: "#fff",
        borderRadius: 3,
        p: 4,
        boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
        mx: "auto",
        mt: 5,
        position: "relative",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={700}
        textAlign="center"
        color="primary.main"
        mb={2}
      >
        Create New Document
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <TextField
          label="Title"
          placeholder="Enter document title"
          fullWidth
          margin="normal"
          error={!!errors.title}
          helperText={errors.title?.message}
          {...register("title")}
          autoComplete="off"
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        <TextField
          label="Content"
          placeholder="Enter a short description..."
          fullWidth
          multiline
          rows={4}
          margin="normal"
          error={!!errors.content}
          helperText={errors.content?.message}
          {...register("content")}
          autoComplete="off"
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        <TextField
          select
          label="Document Type"
          fullWidth
          margin="normal"
          error={!!errors.type}
          helperText={errors.type?.message}
          value={type || ""}
          onChange={(e) => setValue("type", e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }}
        >
          <MenuItem value="">-- Select document type --</MenuItem>
          <MenuItem value="PROJECT">Project Document</MenuItem>
          <MenuItem value="ADMINISTRATIVE">Administrative Document</MenuItem>
          <MenuItem value="OTHER">Other Document</MenuItem>
        </TextField>

        {/* Nếu là công văn dự án, hiển thị các trường nhập thông tin dự án */}
        {type === "PROJECT" && (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Project Name"
                  placeholder="Enter project name"
                  fullWidth
                  margin="normal"
                  error={!!errors.projectName}
                  helperText={errors.projectName?.message}
                  {...register("projectName")}
                  autoComplete="off"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Project Manager"
                  placeholder="Select Project Manager"
                  fullWidth
                  margin="normal"
                  error={!!errors.projectManagerId}
                  helperText={errors.projectManagerId?.message}
                  value={projectManagerId || ""}
                  onChange={(e) => setValue("projectManagerId", e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value="">-- Select Project Manager --</MenuItem>
                  {pmList.length === 0 ? (
                    <MenuItem disabled value="">
                      No Project Managers found
                    </MenuItem>
                  ) : (
                    pmList.map((pm) => (
                      <MenuItem key={pm.id} value={pm.id}>
                        {pm.fullName
                          ? `${pm.fullName} (${pm.username})`
                          : pm.username}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Project Deadline"
                  type="date"
                  fullWidth
                  margin="normal"
                  error={!!errors.projectDeadline}
                  helperText={errors.projectDeadline?.message}
                  {...register("projectDeadline")}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Project Priority"
                  fullWidth
                  margin="normal"
                  error={!!errors.projectPriority}
                  helperText={errors.projectPriority?.message}
                  {...register("projectPriority")}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value="">-- Select priority --</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Project Description"
                  placeholder="Enter project description"
                  fullWidth
                  multiline
                  rows={2}
                  margin="normal"
                  error={!!errors.projectDescription}
                  helperText={errors.projectDescription?.message}
                  {...register("projectDescription")}
                  autoComplete="off"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              background: "linear-gradient(90deg,#1976d2,#4791db)",
              boxShadow: "0 2px 8px rgba(24,144,255,.08)",
            }}
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {loading ? "Creating..." : "Create Document"}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            color="secondary"
            onClick={onCancel}
            disabled={loading}
            sx={{ fontWeight: 600, borderRadius: 2, background: "#f8fafc" }}
          >
            Cancel
          </Button>
        </Box>
      </form>

      <Fade in={loading}>
        <Backdrop
          open={loading}
          sx={{
            color: "#fff",
            zIndex: (theme) => theme.zIndex.drawer + 2,
            position: "absolute",
          }}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Fade>
    </Box>
  );
}
