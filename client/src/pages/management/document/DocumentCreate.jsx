
import React, { useEffect, useMemo, useState } from "react";
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
  Paper,
  Divider,
  Alert,
  AlertTitle,
  Stack,
  Chip,
  InputAdornment,
  Collapse,
} from "@mui/material";
import {
  DescriptionOutlined,
  ArticleOutlined,
  BusinessCenterOutlined,
  ManageAccountsOutlined,
  EventOutlined,
  PriorityHighOutlined,
  MonetizationOnOutlined,
  InfoOutlined,
  SendRounded,
  CancelOutlined,
  AssignmentOutlined,
  AccountTreeOutlined,
} from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { createDocumentApi } from "~/services/document.service";
import { fetchPMsApi } from "~/services/account.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

// -------- VALIDATION (giữ nguyên) --------
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
        s.required("Priority is required").oneOf(["LOW", "MEDIUM", "HIGH"], "Select valid priority"),
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
    .transform((value, originalValue) => (originalValue === "" || originalValue == null ? null : value))
    .nullable()
    .when("type", {
      is: "ADMINISTRATIVE",
      then: (s) => s.required("Balance is required").min(0, "Balance must be ≥ 0"),
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

  // Fetch PM list (giữ nguyên logic)
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

  // Tổng hợp lỗi hiển thị gọn (UI only)
  const errorMessages = useMemo(() => {
    const msgs = [];
    Object.values(errors || {}).forEach((e) => {
      if (e?.message) msgs.push(e.message);
    });
    return Array.from(new Set(msgs));
  }, [errors]);

  // Submit handler (giữ nguyên logic)
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
      projectDescription: data.type === "PROJECT" ? data.projectDescription : null,
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
    <Box sx={{ maxWidth: 820, mx: "auto", mt: { xs: 3, md: 5 }, px: { xs: 1.5, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          bgcolor: "#fff",
          borderRadius: 3,
          p: { xs: 2.5, md: 4 },
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          position: "relative",
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
          <DescriptionOutlined color="primary" />
          <Typography variant="h5" fontWeight={800}>
            Create New Document
          </Typography>
          {type ? (
            <Chip
              size="small"
              color={type === "PROJECT" ? "primary" : type === "ADMINISTRATIVE" ? "secondary" : "default"}
              label={type === "PROJECT" ? "Project" : type === "ADMINISTRATIVE" ? "Administrative" : "Other"}
              sx={{ ml: 1 }}
            />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Please fill in the information below. Fields will adapt based on the selected document type.
        </Typography>

        {/* Error summary */}
        {errorMessages.length > 0 && (
          <Alert severity="error" icon={<InfoOutlined fontSize="small" />} sx={{ mb: 2.5, borderRadius: 2 }}>
            <AlertTitle>Validation Errors</AlertTitle>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {errorMessages.map((msg, idx) => (
                <li key={idx}>
                  <Typography variant="body2">{msg}</Typography>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            console.log("🟡 Submit clicked");
            handleSubmit(onSubmit)(e);
          }}
          autoComplete="off"
        >
          {/* General */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              General
            </Typography>
            <Divider sx={{ mt: 0.5, mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  placeholder="Enter document title"
                  fullWidth
                  margin="dense"
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  {...register("title")}
                  autoComplete="off"
                  InputProps={{
                    sx: { borderRadius: 2 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <ArticleOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Content"
                  placeholder="Enter a short description..."
                  fullWidth
                  multiline
                  rows={4}
                  margin="dense"
                  error={!!errors.content}
                  helperText={errors.content?.message}
                  {...register("content")}
                  autoComplete="off"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Document Type"
                  fullWidth
                  margin="dense"
                  error={!!errors.type}
                  helperText={errors.type?.message || "Select the document category"}
                  value={type || ""}
                  onChange={(e) => setValue("type", e.target.value)}
                  InputProps={{
                    sx: { borderRadius: 2 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessCenterOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="">-- Select document type --</MenuItem>
                  <MenuItem value="PROJECT">Project Document</MenuItem>
                  <MenuItem value="ADMINISTRATIVE">Administrative Document</MenuItem>
                  <MenuItem value="OTHER">Other Document</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          {/* Project Details */}
          <Collapse in={type === "PROJECT"} unmountOnExit>
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                Project Details
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Project Name"
                    placeholder="Enter project name"
                    fullWidth
                    margin="dense"
                    error={!!errors.projectName}
                    helperText={errors.projectName?.message}
                    {...register("projectName")}
                    autoComplete="off"
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <AssignmentOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Project Manager"
                    placeholder="Select Project Manager"
                    fullWidth
                    margin="dense"
                    error={!!errors.projectManagerId}
                    helperText={errors.projectManagerId?.message}
                    value={projectManagerId || ""}
                    onChange={(e) => setValue("projectManagerId", e.target.value)}
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <ManageAccountsOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    <MenuItem value="">-- Select Project Manager --</MenuItem>
                    {pmList.length === 0 ? (
                      <MenuItem disabled value="">
                        No Project Managers found
                      </MenuItem>
                    ) : (
                      pmList.map((pm) => (
                        <MenuItem key={pm.id} value={pm.id}>
                          {pm.fullName ? `${pm.fullName} (${pm.username})` : pm.username}
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
                    margin="dense"
                    error={!!errors.projectDeadline}
                    helperText={errors.projectDeadline?.message}
                    {...register("projectDeadline")}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <EventOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Project Priority"
                    fullWidth
                    margin="dense"
                    error={!!errors.projectPriority}
                    helperText={errors.projectPriority?.message || "Select a priority level"}
                    {...register("projectPriority")}
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <PriorityHighOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
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
                    rows={3}
                    margin="dense"
                    error={!!errors.projectDescription}
                    helperText={errors.projectDescription?.message}
                    {...register("projectDescription")}
                    autoComplete="off"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* Administrative Details */}
          <Collapse in={type === "ADMINISTRATIVE"} unmountOnExit>
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                Administrative Details
              </Typography>
              <Divider sx={{ mt: 0.5, mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Fund Name"
                    {...register("fundName")}
                    fullWidth
                    error={!!errors.fundName}
                    helperText={errors.fundName?.message}
                    margin="dense"
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountTreeOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Fund Balance"
                    type="number"
                    {...register("fundBalance")}
                    fullWidth
                    error={!!errors.fundBalance}
                    helperText={errors.fundBalance?.message || "Enter amount (≥ 0)"}
                    margin="dense"
                    InputProps={{
                      sx: { borderRadius: 2 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <MonetizationOnOutlined fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      inputProps: { min: 0 },
                    }}
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
                    margin="dense"
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* Actions */}
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} mt={3}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                background: "linear-gradient(90deg,#1976d2,#4791db)",
                boxShadow: "0 2px 10px rgba(25,118,210,0.25)",
                py: 1.3,
              }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendRounded />}
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
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                py: 1.3,
                bgcolor: "#f8fafc",
              }}
              startIcon={<CancelOutlined />}
            >
              Cancel
            </Button>
          </Stack>
        </form>

        {/* Loading overlay (giữ nguyên ý tưởng, tinh chỉnh bo góc) */}
        <Fade in={loading}>
          <Backdrop
            open={loading}
            sx={{
              color: "#fff",
              zIndex: (theme) => theme.zIndex.drawer + 2,
              position: "absolute",
              inset: 0,
              borderRadius: 12,
            }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </Fade>
      </Paper>
    </Box>
  );
}

DocumentCreate.defaultProps = {
  onSuccess: () => {},
  onCancel: () => {},
};