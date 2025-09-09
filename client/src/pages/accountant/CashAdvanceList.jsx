"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  TextField,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import api from "~/utils/axios";

import {
  listAdvancesApi,
  updateCashAdvanceStatusApi,
  sendAdvancesToChiefApi,
  chiefApproveAdvanceApi,
  directorApproveAdvanceApi,
  sendAdvancesToDirectorApi,
} from "~/services/cash-advance.service";

import { renderAsync } from "docx-preview";

const API_BASE = (api?.defaults?.baseURL || "").replace(/\/$/, "");
const normalizeUrl = (u = "") => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return encodeURI(u);
  if (u.startsWith("/uploads")) return encodeURI(`${API_BASE}${u}`);
  const right = u.startsWith("/") ? u : `/${u}`;
  return encodeURI(`${API_BASE}${right}`);
};

const canSendToDirector = (r) =>
  r.status === "APPROVED" && !!r.chiefApprovedAt && !r.sentToDirectorAt;

const sendToDirector = async () => {
  if (selected.length === 0) return;

  const idToRow = new Map(rows.map((r) => [r.id, r]));
  const allEligible = selected.every((id) =>
    canSendToDirector(idToRow.get(id))
  );
  if (!allEligible) {
    dispatch(
      setPopup({
        type: "error",
        message:
          "Only select requests approved by Chief and not yet sent to Director.",
      })
    );
    return;
  }

  try {
    setLoading(true);
    const res = await sendAdvancesToDirectorApi({ requestIds: selected });
    if (res?.status === 200) {
      dispatch(
        setPopup({
          type: "success",
          message: res?.message || "Sent to Director",
        })
      );
      fetchData();
    } else {
      dispatch(
        setPopup({ type: "error", message: res?.message || "Send failed" })
      );
    }
  } catch {
    dispatch(
      setPopup({ type: "error", message: "Server error while sending" })
    );
  } finally {
    setLoading(false);
  }
};

/* File Preview Dialog */
function FilePreviewDialog({ open, onClose, url }) {
  const href = useMemo(() => normalizeUrl(url || ""), [url]);
  const ext = useMemo(() => {
    const m = (href || "").toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
    return m ? m[1] : "";
  }, [href]);

  const isPdf = ext === "pdf";
  const isDocx = ext === "docx" || ext === "doc";

  const hostRef = useRef(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxErr, setDocxErr] = useState("");

  useEffect(() => {
    if (!(open && isDocx && href)) return;
    let alive = true;

    const fetchAndRender = async () => {
      try {
        setDocxLoading(true);
        setDocxErr("");

        const fetchUrl = href.startsWith(API_BASE)
          ? href.slice(API_BASE.length) || "/"
          : href;

        const res = await api.get(fetchUrl, { responseType: "arraybuffer" });
        if (!alive) return;

        if (hostRef.current) {
          hostRef.current.innerHTML = "";
          await renderAsync(res.data, hostRef.current, undefined, {
            className: "docx",
            inWrapper: true,
            ignoreFonts: true,
            useMathMLPolyfill: true,
          });
        }
      } catch (e) {
        if (alive) {
          setDocxErr("Unable to preview DOCX. Please open the file directly.");
        }
      } finally {
        if (alive) setDocxLoading(false);
      }
    };

    fetchAndRender();
    return () => {
      alive = false;
    };
  }, [open, isDocx, href]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>File Preview</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {!url ? (
          <Box p={2}>
            <Typography variant="body2">No file available.</Typography>
          </Box>
        ) : isPdf ? (
          <object data={href} type="application/pdf" width="100%" height="80vh">
            <Box p={2}>
              <Typography>Unable to preview. Open directly:</Typography>
              <Link href={href} target="_blank" rel="noreferrer">
                {href}
              </Link>
            </Box>
          </object>
        ) : isDocx ? (
          <Box sx={{ height: "80vh", overflow: "auto", bgcolor: "#fff", p: 2 }}>
            {docxLoading && (
              <Typography sx={{ p: 2 }}>Loading DOCX…</Typography>
            )}
            {!!docxErr && (
              <Box p={2}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {docxErr}
                </Typography>
                <Link href={href} target="_blank" rel="noreferrer">
                  {href}
                </Link>
              </Box>
            )}
            <div ref={hostRef} />
          </Box>
        ) : (
          <Box p={2}>
            <Typography variant="body2">
              Preview not supported for this file type. Open directly:
            </Typography>
            <Link href={href} target="_blank" rel="noreferrer">
              {href}
            </Link>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ReviewDialog({ open, onClose, onSubmit, mode, loading }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  const showNote = mode === "REJECTED";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === "APPROVED" ? "Approve Cash Advance" : "Reject Cash Advance"}
      </DialogTitle>
      <DialogContent dividers>
        {showNote ? (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Note (optional)
            </Typography>
            <TextField
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter a note..."
              fullWidth
              multiline
              minRows={3}
            />
          </>
        ) : (
          <Typography variant="body2">
            You are about to approve this request.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          onClick={() => onSubmit(note)}
          variant="contained"
          color={mode === "APPROVED" ? "success" : "error"}
          disabled={loading}
        >
          {loading
            ? "Submitting..."
            : mode === "APPROVED"
            ? "Approve"
            : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const STATUS_COLOR = (s) =>
  s === "APPROVED"
    ? "success"
    : s === "REJECTED"
    ? "error"
    : s === "PENDING"
    ? "info"
    : "default";

/* ================== Main ================== */
export default function CashAdvanceList() {
  const dispatch = useDispatch();

  const me = useSelector((state) => state.account.value);
  console.log(me?.role);
  const myRole = me?.role;
  const isAccountant = myRole === "ACCOUNTANT" || myRole === "ADMIN";
  const isChief = myRole === "CHIEFACCOUNTANT" || myRole === "ADMIN";
  const isDirector = myRole === "MANAGER" || myRole === "ADMIN";

  const [view, setView] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState("APPROVED");
  const [reviewId, setReviewId] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      let params = {};
      switch (view) {
        case "ALL":
          params = { status: "ALL" };
          break;
        case "MY":
          params = { scope: "MY", status: "ALL" };
          break;
        case "PENDING":
        case "APPROVED":
        case "REJECTED":
          params = { status: view };
          break;
        default:
          params = { status: "ALL" };
      }

      const res = await listAdvancesApi(params);
      let data = Array.isArray(res?.data) ? res.data : [];

      const order = { PENDING: 1, APPROVED: 2, REJECTED: 3 };
      data.sort((a, b) => (order[a.status] || 99) - (order[b.status] || 99));

      setRows(data);
    } catch {
      setRows([]);
      dispatch(setPopup({ type: "error", message: "Failed to load list" }));
    } finally {
      setLoading(false);
      setSelected([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [view]);

  const toggleAll = () =>
    setSelected((prev) =>
      prev.length === rows.length ? [] : rows.map((r) => r.id)
    );
  const toggleOne = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const openFile = (url) => {
    setViewerUrl(url || "");
    setViewerOpen(true);
  };

  const onReview = (id, mode) => {
    setReviewId(id);
    setReviewMode(mode);
    setReviewOpen(true);
  };

  const submitReview = async (note) => {
    if (!reviewId) return;
    try {
      setReviewing(true);
      const res = await updateCashAdvanceStatusApi(reviewId, {
        status: reviewMode,
        note: note?.trim() || undefined,
      });
      if (res?.status === 200) {
        dispatch(
          setPopup({
            type: "success",
            message: res?.message || "Update successful",
          })
        );
        setReviewOpen(false);
        fetchData();
      } else {
        dispatch(
          setPopup({
            type: "error",
            message: res?.message || "Update failed",
          })
        );
      }
    } catch {
      dispatch(
        setPopup({ type: "error", message: "Server error while updating" })
      );
    } finally {
      setReviewing(false);
    }
  };

  const sendToChief = async () => {
    if (selected.length === 0) return;
    try {
      setLoading(true);
      const res = await sendAdvancesToChiefApi({ requestIds: selected });
      if (res?.status === 200)
        dispatch(
          setPopup({
            type: "success",
            message: res?.message || "Sent to Chief Accountant",
          })
        );
      else
        dispatch(
          setPopup({ type: "error", message: res?.message || "Send failed" })
        );
      fetchData();
    } catch {
      dispatch(
        setPopup({ type: "error", message: "Server error while sending" })
      );
    } finally {
      setLoading(false);
    }
  };

  // Điều kiện hiển thị nút duyệt của KTT
  const canChiefApprove = (r) =>
    r.status === "APPROVED" &&
    !!r.sentToChiefAt &&
    !r.chiefApprovedAt &&
    (!r.chiefAssigneeId || r.chiefAssigneeId === me?.id);

  // Điều kiện hiển thị nút duyệt của Giám đốc
  const canDirectorApprove = (r) =>
    r.status === "APPROVED" &&
    !!r.chiefApprovedAt &&
    !!r.sentToDirectorAt &&
    !r.directorApprovedAt &&
    (!r.directorAssigneeId || r.directorAssigneeId === me?.id);

  const onChiefApprove = async (id) => {
    try {
      setLoading(true);
      const res = await chiefApproveAdvanceApi(id);
      if (res?.status === 200) {
        dispatch(
          setPopup({
            type: "success",
            message: res?.message || "Chief approved",
          })
        );
        fetchData();
      } else {
        dispatch(
          setPopup({ type: "error", message: res?.message || "Approve failed" })
        );
      }
    } catch {
      dispatch(
        setPopup({ type: "error", message: "Server error while approving" })
      );
    } finally {
      setLoading(false);
    }
  };

  const onDirectorApprove = async (id) => {
    try {
      setLoading(true);
      const res = await directorApproveAdvanceApi(id);
      if (res?.status === 200) {
        dispatch(
          setPopup({
            type: "success",
            message: res?.message || "Director approved",
          })
        );
        fetchData();
      } else {
        dispatch(
          setPopup({ type: "error", message: res?.message || "Approve failed" })
        );
      }
    } catch {
      dispatch(
        setPopup({ type: "error", message: "Server error while approving" })
      );
    } finally {
      setLoading(false);
    }
  };

  const allChecked = selected.length > 0 && selected.length === rows.length;

  return (
    <Box p={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Cash Advance Requests
        </Typography>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="view">Status</InputLabel>
          <Select
            labelId="view"
            label="Status"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
            <MenuItem value="MY">My Requests</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={fetchData}>
          {loading ? <CircularProgress size={18} /> : "Reload"}
        </Button>

        {isAccountant && (
          <Tooltip title="Select rows to send to the Chief Accountant (backend checks permissions)">
            <span>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={sendToChief}
                disabled={loading || selected.length === 0}
              >
                Send to Chief Accountant
              </Button>
            </span>
          </Tooltip>
        )}
        {isChief && (
          <Tooltip title="Select rows to send to the Director (backend checks permissions)">
            <span>
              <Button
                startIcon={<SendIcon />}
                onClick={sendToDirector}
                disabled={
                  loading ||
                  selected.length === 0 ||
                  !selected.every((id) =>
                    canSendToDirector(rows.find((r) => r.id === id))
                  )
                }
              >
                Send to Director
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                {isAccountant ? (
                  <Checkbox
                    checked={allChecked}
                    indeterminate={
                      selected.length > 0 && selected.length < rows.length
                    }
                    onChange={toggleAll}
                  />
                ) : null}
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Project / Phase / Task</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell padding="checkbox">
                  {isAccountant || isChief ? (
                    <Checkbox
                      checked={selected.includes(r.id)}
                      onChange={() => toggleOne(r.id)}
                      disabled={isChief && !canSendToDirector(r)}
                    />
                  ) : null}
                </TableCell>
                <TableCell>{r.id}</TableCell>
                <TableCell sx={{ maxWidth: 260 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    title={`${r.projectName || ""} / ${r.phaseName || ""} / ${
                      r.taskName || ""
                    }`}
                  >
                    {(r.projectName || "-") +
                      " / " +
                      (r.phaseName || "-") +
                      " / " +
                      (r.taskName || "-")}
                  </Typography>
                </TableCell>
                <TableCell>
                  {typeof r.amount === "number"
                    ? r.amount.toLocaleString()
                    : r.amount}
                </TableCell>
                <TableCell>
                  {r.fileUrl ? (
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => openFile(r.fileUrl)}
                    >
                      View File
                    </Button>
                  ) : (
                    <Chip size="small" label="No file" />
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 240 }}>
                  <Typography variant="body2" noWrap title={r.reason || ""}>
                    {r.reason || "-"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={STATUS_COLOR(r.status)}
                    label={r.status}
                  />
                </TableCell>
                <TableCell>
                  {r.createdByUsername || r.createdById || "-"}
                </TableCell>
                <TableCell>
                  {r.createdAt
                    ? dayjs(r.createdAt).format("YYYY-MM-DD HH:mm")
                    : "-"}
                </TableCell>
                <TableCell align="right">
                  {/* ACCOUNTANT: duyệt PENDING */}
                  {isAccountant && (
                    <>
                      <Tooltip title="Approve (Accountant)">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onReview(r.id, "APPROVED")}
                            disabled={r.status !== "PENDING"}
                          >
                            <CheckIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Reject (Accountant)">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onReview(r.id, "REJECTED")}
                            disabled={r.status !== "PENDING"}
                          >
                            <CloseIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}

                  {/* CHIEF ACCOUNTANT: duyệt khi đã gửi lên chief */}
                  {isChief && canChiefApprove(r) && (
                    <Tooltip title="Approve (Chief Accountant)">
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => onChiefApprove(r.id)}
                          disabled={loading}
                        >
                          <CheckIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}

                  {/* MANAGER/DIRECTOR: duyệt khi đã gửi lên director & chief đã approved */}
                  {isDirector && canDirectorApprove(r) && (
                    <Tooltip title="Approve (Director)">
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => onDirectorApprove(r.id)}
                          disabled={loading}
                        >
                          <CheckIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <FilePreviewDialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        url={viewerUrl}
      />
      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSubmit={submitReview}
        mode={reviewMode}
        loading={reviewing}
      />
    </Box>
  );
}
