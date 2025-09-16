import React, { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  DescriptionOutlined,
  ArticleOutlined,
  BusinessCenterOutlined,
  ManageAccountsOutlined,
  EventOutlined,
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
<<<<<<< Updated upstream
=======
import { useEffect, useMemo, useState } from "react";
>>>>>>> Stashed changes
import { createDocumentApi } from "~/services/document.service";
import { fetchPMsApi } from "~/services/account.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

// -------- VALIDATION --------
const schema = yup.object().shape({
  title: yup.string().required("Please enter the title"),
  content: yup.string().required("Please enter the content"),
  type: yup.string().required("Please select document type"),

  // PROJECT
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
<<<<<<< Updated upstream

  attachFund: yup.boolean().default(false),

  // Fund fields validation when ADMINISTRATIVE or PROJECT with attachFund
  fundBalance: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value
    )
    .nullable()
    .when(["type", "attachFund"], (values, s) => {
      const [type, attachFund] = values || [];
      return type === "ADMINISTRATIVE" || (type === "PROJECT" && attachFund)
        ? s.required("Balance is required").min(0, "Balance must be ≥ 0")
        : s.nullable();
    }),
  fundPurpose: yup
    .string()
    .nullable()
    .when(["type", "attachFund"], (values, s) => {
      const [type, attachFund] = values || [];
      return type === "ADMINISTRATIVE" || (type === "PROJECT" && attachFund)
        ? s.required("Purpose is required")
        : s.nullable();
    }),

  eventStartDate: yup.string().nullable(),
  eventEndDate: yup
    .string()
    .nullable()
    .test(
      "end-after-start",
      "End date must be after start date",
      function (value) {
        const start = this.parent.eventStartDate;
        if (!value || !start) return true;
        return new Date(value) >= new Date(start);
      }
    ),
=======
>>>>>>> Stashed changes
});

export default function DocumentCreate({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [pmList, setPmList] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
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
<<<<<<< Updated upstream
=======
      fundName: "",
>>>>>>> Stashed changes
      fundBalance: "",
      fundPurpose: "",
      attachFund: false,
      eventStartDate: "",
      eventEndDate: "",
    },
  });

  const type = watch("type");
  const projectManagerId = watch("projectManagerId");
  const attachFund = watch("attachFund");
  const title = watch("title");

  // Chỉ hiển thị thông tin lỗi an toàn (tránh circular refs)
  const safeErrors = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(errors || {})) {
      out[k] = { type: v?.type, message: v?.message };
    }
    return out;
  }, [errors]);

  // Fetch PM list
  useEffect(() => {
    let ignore = false;
    async function fetchPMs() {
      if (type !== "PROJECT") return;
      setPmLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetchPMsApi(token);
<<<<<<< Updated upstream
        const list = res.status === 200 ? res.data : [];
=======
        setPmList(res?.status === 200 ? res.data || [] : []);
      }
      fetchPMs();
    }
  }, [type]);
>>>>>>> Stashed changes

        if (!ignore) setPmList(list || []);
        if ((res.status !== 200 || !list || list.length === 0) && !ignore) {
          dispatch(
            setPopup({
              type: "error",
              message:
                "No Project Manager available. Please create a PM first.",
            })
          );
        }
      } catch (e) {
        if (!ignore) {
          setPmList([]);
          dispatch(
            setPopup({
              type: "error",
              message: "Failed to load Project Managers.",
            })
          );
        }
      } finally {
        if (!ignore) setPmLoading(false);
      }
    }
    fetchPMs();
    return () => {
      ignore = true;
    };
  }, [type, dispatch]);

  // Gộp lỗi hiển thị
  const errorMessages = useMemo(() => {
    const msgs = [];
    Object.values(errors || {}).forEach((e) => {
      if (e && e.message) msgs.push(e.message);
    });
    return Array.from(new Set(msgs));
  }, [errors]);

  // Submit
  const onSubmit = async (data) => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");

    if (data.type === "PROJECT" && pmList.length === 0) {
      dispatch(
        setPopup({
          type: "error",
          message: "No Project Manager available. Please create a PM first.",
        })
      );
      setLoading(false);
      return;
    }

    const base = {
      title: data.title,
      content: data.content,
      type: data.type,
<<<<<<< Updated upstream
=======

      pmId: data.type === "PROJECT" ? Number(data.projectManagerId) : null,
      receiverId:
        data.type === "PROJECT"
          ? Number(data.projectManagerId)
          : data.type === "OTHER"
          ? data.receiverId ?? null
          : null,

      projectName: data.type === "PROJECT" ? data.projectName : null,
      projectDescription:
        data.type === "PROJECT" ? data.projectDescription : null,
      projectDeadline: data.type === "PROJECT" ? data.projectDeadline : null, // YYYY-MM-DD

      fundName: data.type === "ADMINISTRATIVE" ? data.fundName : null,
      fundBalance:
        data.type === "ADMINISTRATIVE"
          ? (data.fundBalance === "" ? null : Number(data.fundBalance))
          : null,
      fundPurpose: data.type === "ADMINISTRATIVE" ? data.fundPurpose : null,
>>>>>>> Stashed changes
    };

    let payload = { ...base };

    if (data.type === "PROJECT") {
      payload.pmId = data.projectManagerId;
      payload.projectName = data.projectName;
      payload.projectDescription = data.projectDescription;
      payload.projectDeadline = data.projectDeadline || null;

      if (data.attachFund) {
        payload.fundName = data.title;
        payload.fundBalance = data.fundBalance ?? null;
        payload.fundPurpose = data.fundPurpose ?? null;
        payload.eventStartDate = data.eventStartDate || null;
        payload.eventEndDate = data.eventEndDate || null;
      } else {
        payload.fundName = null;
        payload.fundBalance = null;
        payload.fundPurpose = null;
        payload.eventStartDate = null;
        payload.eventEndDate = null;
      }
    }

    if (data.type === "ADMINISTRATIVE") {
      payload.fundName = data.title;
      payload.fundBalance = data.fundBalance ?? null;
      payload.fundPurpose = data.fundPurpose ?? null;
      payload.eventStartDate = null;
      payload.eventEndDate = null;
    }

    try {
      const res = await createDocumentApi(payload, token);
<<<<<<< Updated upstream
      if (res.status === 201) {
=======
      if (res?.status === 201) {
>>>>>>> Stashed changes
        dispatch(
          setPopup({
            type: "success",
            message: "Tạo công văn thành công!",
          })
        );
        onSuccess?.(res.data);
        reset();
      } else {
<<<<<<< Updated upstream
        dispatch(
          setPopup({
            type: "error",
            message: res.message || "Create document failed",
          })
        );
      }
    } catch (error) {
=======
        setError("title", {
          type: "manual",
          message: res?.message || "Create document failed",
        });
      }
    } catch (error) {
      setError("title", {
        type: "manual",
        message: "Something went wrong, please try again.",
      });
>>>>>>> Stashed changes
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

  const submitDisabled =
    loading || (type === "PROJECT" && (pmLoading || pmList.length === 0));

  return (
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 960, md: 1120, lg: 1280 },
        width: "100%",
        mx: "auto",
        mt: { xs: 2, md: 3 },
        px: { xs: 1.5, md: 2 },
        height: { xs: "calc(100vh - 32px)", md: "calc(100vh - 48px)" },
      }}
    >
<<<<<<< Updated upstream
      <Paper
        elevation={0}
        sx={{
          bgcolor: "#fff",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100%",
=======
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
          handleSubmit(onSubmit)(e);
>>>>>>> Stashed changes
        }}
      >
<<<<<<< Updated upstream
        {/* Header */}
        <Box sx={{ p: { xs: 2, md: 3 }, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <DescriptionOutlined color="primary" />
            <Typography variant="h5" fontWeight={800}>
              Create New Document
            </Typography>
            {type ? (
              <Chip
                size="small"
                color={
                  type === "PROJECT"
                    ? "primary"
                    : type === "ADMINISTRATIVE"
                    ? "secondary"
                    : "default"
                }
                label={type === "PROJECT" ? "Project" : "Administrative"}
                sx={{ ml: 1 }}
              />
            ) : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Please fill in the information below. Fields will adapt based on the
            selected document type.
          </Typography>
=======
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

        {/* PROJECT fields (priority removed) */}
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
                  onChange={(e) =>
                    setValue(
                      "projectManagerId",
                      e.target.value === "" ? null : e.target.value
                    )
                  }
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
                  inputProps={{
                    min: new Date().toISOString().slice(0, 10),
                  }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
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

        {/* ADMINISTRATIVE fields */}
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

        <Box sx={{ display: "flex", gap: 2, mt: 3, flexDirection: "column" }}>
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
            <Box p={2} bgcolor="#ffe0e0" borderRadius={2}>
              <Typography variant="body2" color="error" sx={{ mb: 0.5 }}>
                ❗ Validation Errors:
              </Typography>
              <pre style={{ fontSize: 12, margin: 0 }}>
                {JSON.stringify(safeErrors, null, 2)}
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
>>>>>>> Stashed changes
        </Box>

        {/* Content (scrollable) */}
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            p: 1,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {errorMessages.length > 0 && (
            <Alert
              severity="error"
              icon={<InfoOutlined fontSize="small" />}
              sx={{ mb: 2, borderRadius: 2 }}
            >
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
            id="docForm"
            onSubmit={(e) => {
              handleSubmit(onSubmit)(e);
            }}
            autoComplete="off"
          >
            {/* Row 1: Title + Type */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* Title - 50% */}
              <Grid item xs={12} md={6}>
                <TextField
                  size="small"
                  label="Title"
                  fullWidth
                  {...register("title")}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              </Grid>

              {/* Document Type - 50% */}
              <Grid item xs={12} md={6}>
                <TextField
                  size="small"
                  select
                  label="Document Type"
                  fullWidth
                  value={type || ""}
                  onChange={(e) => setValue("type", e.target.value)}
                  error={!!errors.type}
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    errors.type?.message || "Select the document category"
                  }
                >
                  <MenuItem value="">-- Select document type --</MenuItem>
                  <MenuItem value="PROJECT">Project Document</MenuItem>
                  <MenuItem value="ADMINISTRATIVE">
                    Administrative Document
                  </MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ width: "100%" }}>
              <Grid
                item
                xs={12}
                sx={{
                  flexBasis: "100% !important",
                  maxWidth: "100% !important",
                }}
              >
                <TextField
                  size="small"
                  label="Content"
                  placeholder="Enter a short description..."
                  fullWidth
                  multiline
                  minRows={3}
                  {...register("content")}
                  error={!!errors.content}
                  helperText={errors.content?.message}
                />
              </Grid>
            </Grid>

            {/* Project Details */}
            <Collapse in={type === "PROJECT"} unmountOnExit>
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: 1.2 }}
                >
                  Project Details
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />

                {/* Row 1: Name + PM + Deadline */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Project Name"
                      fullWidth
                      size="small"
                      {...register("projectName")}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Controller
                      name="projectManagerId"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          select
                          label="Project Manager"
                          fullWidth
                          size="small"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          error={!!errors.projectManagerId}
                          helperText={
                            errors.projectManagerId?.message ||
                            "Select a PM for this project"
                          }
                          disabled={pmLoading}
                          InputLabelProps={{ shrink: true }} // tránh label đè
                          InputProps={{ sx: { borderRadius: 2 } }}
                        >
                          <MenuItem value="">
                            -- Select Project Manager --
                          </MenuItem>
                          {!pmLoading &&
                            pmList?.length > 0 &&
                            pmList.map((pm) => (
                              <MenuItem key={pm.id} value={String(pm.id)}>
                                {pm.firstName} {pm.lastName}
                              </MenuItem>
                            ))}
                          {!pmLoading && (!pmList || pmList.length === 0) && (
                            <MenuItem value="" disabled>
                              No Project Manager available
                            </MenuItem>
                          )}
                        </TextField>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Project Deadline"
                      type="date"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      {...register("projectDeadline")}
                    />
                  </Grid>
                </Grid>

                {/* Row 2: Project Description FULL WIDTH */}
                <Grid container spacing={2}>
                  <Grid
                    item
                    xs={12}
                    sx={{
                      flexBasis: "100% !important",
                      maxWidth: "100% !important",
                    }}
                  >
                    <TextField
                      size="small"
                      label="Project Description"
                      placeholder="Enter project description"
                      fullWidth
                      multiline
                      minRows={6}
                      {...register("projectDescription")}
                      error={!!errors.projectDescription}
                      helperText={errors.projectDescription?.message}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>

            {/* Administrative Details (only Name + Balance) */}
            <Collapse in={type === "ADMINISTRATIVE"} unmountOnExit>
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: 1.2 }}
                >
                  Administrative Details
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      label="Fund Name"
                      value={title || ""}
                      fullWidth
                      margin="dense"
                      InputProps={{
                        readOnly: true,
                        sx: { borderRadius: 2, bgcolor: "#fafafa" },
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccountTreeOutlined
                              fontSize="small"
                              color="action"
                            />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Fund name is auto-filled from Document Title"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      size="small"
                      label="Fund Balance"
                      type="number"
                      {...register("fundBalance")}
                      fullWidth
                      error={!!errors.fundBalance}
                      helperText={
                        errors.fundBalance?.message || "Enter amount (≥ 0)"
                      }
                      margin="dense"
                      InputProps={{
                        sx: { borderRadius: 2 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <MonetizationOnOutlined
                              fontSize="small"
                              color="action"
                            />
                          </InputAdornment>
                        ),
                        inputProps: { min: 0 },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </form>
        </Box>

        {/* Footer sticky */}
        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            p: { xs: 2, md: 3 },
            pt: 2,
            borderTop: "1px solid rgba(0,0,0,0.06)",
            bgcolor: "#fff",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
            <Button
              type="submit"
              form="docForm"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitDisabled}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                background: "linear-gradient(90deg,#1976d2,#4791db)",
                boxShadow: "0 2px 10px rgba(25,118,210,0.25)",
                py: 1.1,
              }}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendRounded />
                )
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
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                textTransform: "none",
                py: 1.1,
                bgcolor: "#f8fafc",
              }}
              startIcon={<CancelOutlined />}
            >
              Cancel
            </Button>
          </Stack>
        </Box>

        {/* Loading overlay */}
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
