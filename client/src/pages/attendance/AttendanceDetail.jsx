import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  alpha,
  useTheme,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  AccessTime,
  Login,
  Logout,
  LocationOn,
  Person,
  Description,
  CheckCircle,
  Cancel,
  Warning,
  Info,
} from "@mui/icons-material";
import {
  getAttendanceByIdApi,
  resolveMissingCheckOutApi,
  submitMissingCheckOutNoteApi,
} from "~/services/attendance.service";
import CustomAvatar from "~/components/custom-avatar";
import { formatDate } from "~/utils/project.utils";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useSelector } from "react-redux";

const getStatusColor = (status) => {
  switch (status) {
    case "CHECKED_OUT":
      return "success";
    case "MISSING_CHECKOUT":
      return "warning";
    case "REJECTED":
      return "error";
    case "RESOLVED":
      return "info";
    default:
      return "default";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "CHECKED_OUT":
      return <CheckCircle />;
    case "MISSING_CHECKOUT":
      return <Warning />;
    case "REJECTED":
      return <Cancel />;
    case "RESOLVED":
      return <Info />;
    default:
      return <AccessTime />;
  }
};

export default function AttendanceDetail() {
  // Mock useParams for preview
  const dispatch = useDispatch();
  const { id } = useParams();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const currentAccount = useSelector((state) => state.account.value);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveApproved, setResolveApproved] = useState(true);
  const [resolveNote, setResolveNote] = useState("");
  const [resolveTouched, setResolveTouched] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getAttendanceByIdApi(id);
        setAttendance(res);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const openResolveDialog = (approved) => {
    if (!attendance.checkOutEmployeeNote) {
      dispatch(
        setPopup({ type: "error", message: "No explanatory notes yet." })
      );
      return;
    }
    setResolveApproved(approved);
    setResolveNote("");
    setResolveTouched(false);
    setResolveDialogOpen(true);
  };

  const doResolve = async () => {
    if (!resolveApproved && !resolveNote.trim()) {
      setResolveTouched(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await resolveMissingCheckOutApi(
        attendance.id,
        resolveNote.trim(),
        resolveApproved
      );
      setAttendance(res);
      dispatch(
        setPopup({
          type: "success",
          message: resolveApproved
            ? "Explanation accepted"
            : "Refused to explain",
        })
      );
      setResolveDialogOpen(false);
    } catch (err) {
      dispatch(
        setPopup({
          type: "error",
          message: err?.message || "Error handling explanation",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleSubmitNote = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await submitMissingCheckOutNoteApi(attendance.id, note.trim());
      setAttendance((prev) => ({ ...prev, checkOutEmployeeNote: note.trim() }));
      setIsEditingNote(false);
      setNote("");
      dispatch(
        setPopup({ type: "success", message: "Explanation sent successfully." })
      );
    } catch (err) {
      dispatch(
        setPopup({ type: "error", message: err?.message || "Sending failed" })
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!attendance) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Box textAlign="center">
          <Cancel sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
          <Typography variant="h6" color="error" align="center">
            No timekeeping data found
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
      <Paper
        elevation={12}
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 4,
          background: `linear-gradient(145deg, ${alpha(
            theme.palette.background.paper,
            0.95
          )}, ${alpha(theme.palette.primary.light, 0.1)})`,
          boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.15)}`,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h4"
            fontWeight={700}
            color="primary.main"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              mb: 1,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
            }}
          >
            <AccessTime sx={{ fontSize: "inherit" }} />
            Attendance Details
          </Typography>
        </Box>

        <Stack spacing={4}>
          {/* Check-in Section */}
          <Card
            elevation={3}
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.success.light,
                0.1
              )}, ${alpha(theme.palette.success.light, 0.05)})`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: "success.main",
                  }}
                >
                  <Login />
                </Box>
                <Typography variant="h6" fontWeight={600} color="success.dark">
                  Check-in Time
                </Typography>
              </Box>

              <Typography
                variant="h5"
                fontWeight={500}
                color="success.main"
                sx={{ mb: 2 }}
              >
                {formatDate(attendance.checkInTime)}
              </Typography>

              {attendance.checkInImagePath && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    color="success.dark"
                    sx={{ mb: 1, fontWeight: 500 }}
                  >
                    Check-in Image:
                  </Typography>
                  <CustomAvatar
                    src={attendance.checkInImagePath}
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      border: `3px solid ${alpha(
                        theme.palette.success.main,
                        0.3
                      )}`,
                      boxShadow: `0 8px 16px ${alpha(
                        theme.palette.success.main,
                        0.2
                      )}`,
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Check-out Section */}
          <Card
            elevation={3}
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.info.light,
                0.1
              )}, ${alpha(theme.palette.info.light, 0.05)})`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: "info.main",
                  }}
                >
                  <Logout />
                </Box>
                <Typography variant="h6" fontWeight={600} color="info.dark">
                  Check-out Time
                </Typography>
              </Box>

              <Typography
                variant="h5"
                fontWeight={500}
                color="info.main"
                sx={{ mb: 2 }}
              >
                {attendance.checkOutTime
                  ? formatDate(attendance.checkOutTime)
                  : "Not Checked Out"}
              </Typography>

              {attendance.checkOutImagePath && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    color="info.dark"
                    sx={{ mb: 1, fontWeight: 500 }}
                  >
                    Check-out Image:
                  </Typography>
                  <CustomAvatar
                    src={attendance.checkOutImagePath}
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      border: `3px solid ${alpha(
                        theme.palette.info.main,
                        0.3
                      )}`,
                      boxShadow: `0 8px 16px ${alpha(
                        theme.palette.info.main,
                        0.2
                      )}`,
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Status Section */}
          <Card
            elevation={3}
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.secondary.light,
                0.1
              )}, ${alpha(theme.palette.secondary.light, 0.05)})`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: "secondary.main",
                  }}
                >
                  {getStatusIcon(attendance.status)}
                </Box>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color="secondary.dark"
                >
                  Status
                </Typography>
              </Box>

              <Chip
                icon={getStatusIcon(attendance.status)}
                label={attendance.status}
                color={getStatusColor(attendance.status)}
                sx={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  px: 2,
                  py: 3,
                  height: "auto",
                  "& .MuiChip-icon": { fontSize: "1.2rem" },
                }}
              />
            </CardContent>
          </Card>

          {/* Face Match & Location Grid */}
          <Grid container spacing={3}>
            {/* Face Match */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={3}
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.warning.light,
                    0.1
                  )}, ${alpha(theme.palette.warning.light, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        color: "warning.main",
                      }}
                    >
                      <Person />
                    </Box>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color="warning.dark"
                    >
                      Face Match
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {attendance.faceMatch === true ? (
                      <CheckCircle sx={{ color: "success.main" }} />
                    ) : attendance.faceMatch === false ? (
                      <Cancel sx={{ color: "error.main" }} />
                    ) : (
                      <Warning sx={{ color: "warning.main" }} />
                    )}
                    <Typography
                      variant="h6"
                      fontWeight={500}
                      color={
                        attendance.faceMatch === true
                          ? "success.main"
                          : attendance.faceMatch === false
                          ? "error.main"
                          : "warning.main"
                      }
                    >
                      {attendance.faceMatch === true
                        ? "Matched"
                        : attendance.faceMatch === false
                        ? "Not Matched"
                        : "Unknown"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Location Check */}
            <Grid item xs={12} md={6}>
              <Card
                elevation={3}
                sx={{
                  height: "100%",
                  background: `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.light,
                    0.1
                  )}, ${alpha(theme.palette.primary.light, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: "primary.main",
                      }}
                    >
                      <LocationOn />
                    </Box>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color="primary.dark"
                    >
                      Location Check
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    {attendance.locationValid === true ? (
                      <CheckCircle sx={{ color: "success.main" }} />
                    ) : attendance.locationValid === false ? (
                      <Cancel sx={{ color: "error.main" }} />
                    ) : (
                      <Warning sx={{ color: "warning.main" }} />
                    )}
                    <Typography
                      variant="h6"
                      fontWeight={500}
                      color={
                        attendance.locationValid === true
                          ? "success.main"
                          : attendance.locationValid === false
                          ? "error.main"
                          : "warning.main"
                      }
                    >
                      {attendance.locationValid === true
                        ? "Valid"
                        : attendance.locationValid === false
                        ? "Invalid"
                        : "Unknown"}
                    </Typography>
                  </Box>

                  {attendance.distanceKm != null && (
                    <Typography variant="body1" color="primary.dark">
                      Distance to Office:{" "}
                      <Typography component="span" fontWeight={600}>
                        {attendance.distanceKm.toFixed(2)} km
                      </Typography>
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Notes Section */}
          <Card
            elevation={3}
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.grey[300],
                0.1
              )}, ${alpha(theme.palette.grey[300], 0.05)})`,
              border: `1px solid ${alpha(theme.palette.grey[400], 0.2)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.grey[600], 0.1),
                    color: "grey.600",
                  }}
                >
                  <Description />
                </Box>
                <Typography variant="h6" fontWeight={600} color="grey.700">
                  Explanation Note
                </Typography>
              </Box>

              <Typography
                variant="body1"
                color="text.primary"
                sx={{ lineHeight: 1.6 }}
              >
                {attendance.checkOutEmployeeNote || "No explanation provided."}
              </Typography>

              {attendance.status === "MISSING_CHECKOUT" &&
                attendance.account?.id === currentAccount?.id && (
                  <>
                    {attendance.checkOutEmployeeNote ? (
                      // Nếu đã có ghi chú rồi thì cho phép chỉnh sửa
                      <Button
                        variant="outlined"
                        sx={{ mt: 2 }}
                        onClick={() => {
                          setNote(attendance.checkOutEmployeeNote);
                          setIsEditingNote(true);
                        }}
                      >
                        Edit Note
                      </Button>
                    ) : (
                      // Nếu chưa có ghi chú thì cho nhập luôn
                      <Box mt={3}>
                        <TextField
                          label="Enter your Explanation"
                          multiline
                          fullWidth
                          minRows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          sx={{ mb: 2 }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleSubmitNote}
                          disabled={submitting}
                        >
                          {submitting ? "Submitting..." : "Submit Note"}
                        </Button>
                      </Box>
                    )}
                  </>
                )}

              {isEditingNote &&
                attendance.account?.id === currentAccount?.id && (
                  <Box mt={3}>
                    <TextField
                      label="Edit notes"
                      multiline
                      fullWidth
                      minRows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Box display="flex" gap={2}>
                      <Button
                        variant="contained"
                        disabled={submitting}
                        onClick={handleSubmitNote}
                      >
                        {submitting ? "Submitting..." : "Lưu"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setIsEditingNote(false)}
                      >
                        Hủy
                      </Button>
                    </Box>
                  </Box>
                )}
              {currentAccount?.role === "HR" &&
                attendance.status === "MISSING_CHECKOUT" &&
                !!attendance.checkOutEmployeeNote && (
                  <Box mt={3} display="flex" gap={2}>
                    <Button
                      variant="contained"
                      color="success"
                      disabled={submitting}
                      onClick={() => openResolveDialog(true)}
                    >
                      {submitting ? "Processing..." : "Approve"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={submitting}
                      onClick={() => openResolveDialog(false)}
                    >
                      Reject
                    </Button>
                  </Box>
                )}

              {(attendance.hrDecision || attendance.checkOutHrNote) && (
                <Box mt={2}>
                  <Chip
                    label={
                      attendance.hrDecision === "APPROVED"
                        ? "Approved"
                        : "Rejected"
                    }
                    color={
                      attendance.hrDecision === "APPROVED" ? "success" : "error"
                    }
                    sx={{ mr: 1 }}
                  />
                  {attendance.hrResolvedAt && (
                    <Typography variant="body2" sx={{ display: "inline" }}>
                      • {new Date(attendance.hrResolvedAt).toLocaleString()}
                    </Typography>
                  )}
                  {attendance.checkOutHrNote && (
                    <Typography variant="body1" sx={{ mt: 1 }}>
                      HR note: {attendance.checkOutHrNote}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>
        <Dialog
          open={resolveDialogOpen}
          onClose={() => setResolveDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {resolveApproved ? "Approve explanation" : "Reject explanation"}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              fullWidth
              multiline
              minRows={3}
              label={
                resolveApproved ? "HR note (optional)" : "HR note (required)"
              }
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              onBlur={() => setResolveTouched(true)}
              error={!resolveApproved && resolveTouched && !resolveNote.trim()}
              helperText={
                !resolveApproved && resolveTouched && !resolveNote.trim()
                  ? "Please enter a reason to reject."
                  : " "
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResolveDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={doResolve}
              disabled={submitting || (!resolveApproved && !resolveNote.trim())}
            >
              {submitting
                ? "Saving..."
                : resolveApproved
                ? "Approve"
                : "Reject"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
