import {
  Box,
  Typography,
  Paper,
  Stack,
  alpha,
  useTheme,
  CircularProgress,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Divider,
} from "@mui/material";
import { WarningAmber, Save, ArrowBack } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { fetchPMsApi } from "~/services/account.service";
import {
  fetchDocumentDetailApi,
  updateDocumentApi,
} from "~/services/document.service";

export default function DocumentUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useDispatch();
  const account = useSelector((state) => state.account.value);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // PM list
  const [pmOptions, setPmOptions] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Common
  const [type, setType] = useState(""); // PROJECT | ADMINISTRATIVE | ...
  const [status, setStatus] = useState("");

  // PROJECT fields
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPriority, setProjectPriority] = useState(""); // HIGH|MEDIUM|LOW
  const [projectDeadline, setProjectDeadline] = useState(""); // yyyy-MM-dd
  const [pmId, setPmId] = useState(null); // allow changing PM

  // ADMINISTRATIVE fields
  const [fundName, setFundName] = useState("");
  const [fundBalance, setFundBalance] = useState("");
  const [fundPurpose, setFundPurpose] = useState("");

  // Manager note
  const [managerNote, setManagerNote] = useState("");

  const canEdit = useMemo(() => {
    return account?.role === "ADMIN" && status === "NEW";
  }, [account?.role, status]);

  const loadPMs = async () => {
    setPmLoading(true);
    try {
      const res = await fetchPMsApi(); // expect { status:200, data:[{id, username, employee?}] }
      if (res?.status === 200 && Array.isArray(res.data)) {
        const mapped = res.data.map((u) => ({
          id: u.id,
          label:
            u?.employee
              ? `${u.employee.firstName ?? ""} ${u.employee.lastName ?? ""}`.trim() ||
                u.username
              : u.username,
        }));
        setPmOptions(mapped);
      } else {
        setPmOptions([]);
      }
    } catch (e) {
      setPmOptions([]);
    } finally {
      setPmLoading(false);
    }
  };

  const loadDetail = async () => {
    setLoading(true);
    const res = await fetchDocumentDetailApi(id);
    setLoading(false);
    if (res.status !== 200 || !res.data) {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Failed to load document detail",
        })
      );
      return;
    }
    const d = res.data;

    // Prefill
    setTitle(d.title || "");
    setContent(d.content || "");
    setType(d.type || "");
    setStatus(d.status || "");
    setManagerNote(d.managerNote || "");

    // PROJECT
    setProjectName(d.projectName || "");
    setProjectDescription(d.projectDescription || "");
    setProjectPriority(d.projectPriority || "");
    setProjectDeadline(d.projectDeadline || ""); // yyyy-MM-dd
    setPmId(d.pmId || null);

    // ADMIN
    setFundName(d.fundName || "");
    setFundBalance(typeof d.fundBalance === "number" ? String(d.fundBalance) : "");
    setFundPurpose(d.fundPurpose || "");
  };

  useEffect(() => {
    if (!id) return;
    loadDetail();
  }, [id]);

  // Load PMs only when this document is a PROJECT
  useEffect(() => {
    if (type === "PROJECT") {
      loadPMs();
    }
  }, [type]);

  const handleSubmit = async () => {
    if (!canEdit) {
      dispatch(
        setPopup({
          type: "error",
          message: "Only the secretary can edit when status is NEW.",
        })
      );
      return;
    }

    const payload = {
      title: title?.trim(),
      content: content?.trim(),
      type, // backend decides which fields are applicable
    };

    if (type === "PROJECT") {
      payload.projectName = projectName?.trim() || null;
      payload.projectDescription = projectDescription?.trim() || null;
      payload.projectPriority = projectPriority || null;
      payload.projectDeadline = projectDeadline || null; // yyyy-MM-dd
      if (pmId) payload.pmId = pmId;
    } else if (type === "ADMINISTRATIVE") {
      payload.fundName = fundName?.trim() || null;
      payload.fundBalance =
        fundBalance !== "" && !Number.isNaN(Number(fundBalance))
          ? Number(fundBalance)
          : null;
      payload.fundPurpose = fundPurpose?.trim() || null;
    }

    setSaving(true);
    const res = await updateDocumentApi(id, payload);
    setSaving(false);

    if (res.status === 200) {
      dispatch(
        setPopup({
          type: "success",
          message: "Updated and history saved successfully.",
        })
      );
      navigate(`/management/documents/${id}`);
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Update failed. Please try again.",
        })
      );
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Button
          variant="text"
          component={Link}
          to={`/documents/${id}`}
          startIcon={<ArrowBack />}
          sx={{ textTransform: "none" }}
        >
          Back to detail
        </Button>
        <Typography variant="h5" fontWeight={800}>
          Revise document
        </Typography>
      </Stack>

      {!canEdit && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            background: alpha(theme.palette.error.light, 0.08),
          }}
          elevation={0}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WarningAmber color="error" />
            <Typography color="error">
              Only the secretary can edit when status is <b>NEW</b>.
            </Typography>
          </Stack>
        </Paper>
      )}

      {managerNote && (
        <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} color="warning.main" sx={{ mb: 1 }}>
              🗒️ Manager note
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.warning.light, 0.06),
                borderColor: alpha(theme.palette.warning.main, 0.3),
                whiteSpace: "pre-wrap",
              }}
            >
              {managerNote}
            </Paper>
          </CardContent>
        </Card>
      )}

      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: alpha(theme.palette.background.paper, 0.9),
        }}
      >
        <Stack spacing={2}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            disabled={!canEdit}
          />

          <TextField
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            multiline
            minRows={5}
            disabled={!canEdit}
          />

          {type === "PROJECT" && (
            <>
              <Divider textAlign="left">Project info</Divider>

              <TextField
                label="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                fullWidth
                disabled={!canEdit}
              />

              <TextField
                label="Project description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                disabled={!canEdit}
              />

              <TextField
                label="Priority"
                select
                value={projectPriority || ""}
                onChange={(e) => setProjectPriority(e.target.value)}
                fullWidth
                disabled={!canEdit}
              >
                <MenuItem value="">-- Select --</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </TextField>

              <TextField
                label="Deadline"
                type="date"
                value={projectDeadline || ""}
                onChange={(e) => setProjectDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                disabled={!canEdit}
              />

              {/* PM selector */}
              <TextField
                label={pmLoading ? "Loading PMs..." : "Project Manager"}
                select
                value={pmId || ""}
                onChange={(e) => setPmId(Number(e.target.value))}
                fullWidth
                disabled={!canEdit || pmLoading}
              >
                <MenuItem value="">-- Select PM --</MenuItem>
                {pmOptions.map((pm) => (
                  <MenuItem key={pm.id} value={pm.id}>
                    {pm.label}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          {type === "ADMINISTRATIVE" && (
            <>
              <Divider textAlign="left">Fund info</Divider>

              <TextField
                label="Fund name"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                fullWidth
                disabled={!canEdit}
              />
              <TextField
                label="Amount"
                value={fundBalance}
                onChange={(e) => setFundBalance(e.target.value)}
                type="number"
                fullWidth
                disabled={!canEdit}
              />
              <TextField
                label="Purpose"
                value={fundPurpose}
                onChange={(e) => setFundPurpose(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                disabled={!canEdit}
              />
            </>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              component={Link}
              to={`/documents/${id}`}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSubmit}
              disabled={!canEdit || saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
