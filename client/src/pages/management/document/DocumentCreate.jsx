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
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

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
      then: (s) => s.required("Select Project Manager"),
      otherwise: (s) => s.nullable(),
    }),
  projectName: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: (s) => s.required("Project name is required").min(3).max(100),
      otherwise: (s) => s.nullable(),
    }),
  projectDescription: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: (s) => s.required("Description is required").min(10).max(1000),
      otherwise: (s) => s.nullable(),
    }),
  projectDeadline: yup
    .string()
    .nullable()
    .transform((value, originalValue) => {
      if (!originalValue) return null;
      const parsed = new Date(originalValue);
      return isNaN(parsed.getTime()) ? null : originalValue;
    })
    .when("type", {
      is: "PROJECT",
      then: (s) =>
        s
          .required("Deadline is required")
          .test("min-today", "Deadline must be today or later", (value) => {
            if (!value) return false;
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return selectedDate >= today;
          }),
      otherwise: (s) => s.nullable(),
    }),
  projectPriority: yup
    .string()
    .nullable()
    .when("type", {
      is: "PROJECT",
      then: (s) =>
        s
          .required("Priority is required")
          .oneOf(["LOW", "MEDIUM", "HIGH"], "Select valid priority"),
      otherwise: (s) => s.nullable(),
    }),
  // Administrative document fields
  fundName: yup
    .string()
    .nullable()
    .when("type", {
      is: "ADMINISTRATIVE",
      then: (s) => s.required("Fund name is required"),
      otherwise: (s) => s.nullable(),
    }),
  fundBalance: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value
    )
    .nullable()
    .when("type", {
      is: "ADMINISTRATIVE",
      then: (s) =>
        s.required("Balance is required").min(0, "Balance must be ≥ 0"),
      otherwise: (s) => s.nullable(),
    }),
  fundPurpose: yup
    .string()
    .nullable()
    .when("type", {
      is: "ADMINISTRATIVE",
      then: (s) => s.required("Purpose is required"),
      otherwise: (s) => s.nullable(),
    }),
});

export default function DocumentCreate({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [pmList, setPmList] = useState([]);
  const dispatch = useDispatch();

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
      fundName: "",
      fundBalance: "",
      fundPurpose: "",
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

      pmId: data.type === "PROJECT" ? data.projectManagerId : null,
      receiverId:
        data.type === "PROJECT"
          ? data.projectManagerId
          : data.type === "OTHER"
          ? data.receiverId
          : null,

      projectName: data.type === "PROJECT" ? data.projectName : null,
      projectDescription:
        data.type === "PROJECT" ? data.projectDescription : null,
      projectDeadline: data.type === "PROJECT" ? data.projectDeadline : null,
      projectPriority: data.type === "PROJECT" ? data.projectPriority : null,

      fundName: data.type === "ADMINISTRATIVE" ? data.fundName : null,
      fundBalance: data.type === "ADMINISTRATIVE" ? data.fundBalance : null,
      fundPurpose: data.type === "ADMINISTRATIVE" ? data.fundPurpose : null,
    };

    try {
      const res = await createDocumentApi(payload, token);
      console.log("📩 Response:", res);
      if (res.status === 201) {
        dispatch(
          setPopup({
            type: "success",
            message: "Tạo công văn thành công!",
          })
        );
        onSuccess && onSuccess(res.data);
        reset();
      } else {
        setError("title", {
          type: "manual",
          message: res.message || "Create document failed",
        });
      }
    } catch (error) {
      console.error("❌ Failed to create document:", error);
      setError("title", {
        type: "manual",
        message: "Something went wrong, please try again.",
      });

      dispatch(
        setPopup({
          type: "error",
          message: "Tạo công văn thất bại. Vui lòng thử lại sau.",
        })
      );
    } finally {
      setLoading(false);
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

      <form
        onSubmit={(e) => {
          console.log("🟡 Submit clicked");
          handleSubmit(onSubmit)(e);
        }}
        autoComplete="off"
      >
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
        {type === "ADMINISTRATIVE" && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Fund Name"
                {...register("fundName")}
                fullWidth
                error={!!errors.fundName}
                helperText={errors.fundName?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Fund Balance"
                type="number"
                {...register("fundBalance")}
                fullWidth
                error={!!errors.fundBalance}
                helperText={errors.fundBalance?.message}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Fund Purpose"
                multiline
                rows={3}
                {...register("fundPurpose")}
                fullWidth
                error={!!errors.fundPurpose}
                helperText={errors.fundPurpose?.message}
              />
            </Grid>
          </Grid>
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
          {Object.keys(errors).length > 0 && (
            <Box mt={2} p={2} bgcolor="#ffe0e0" borderRadius={2}>
              <Typography variant="body2" color="error">
                ❗ Validation Errors:
              </Typography>
              <pre style={{ fontSize: 12 }}>
                {JSON.stringify(errors, null, 2)}
              </pre>
            </Box>
          )}

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
