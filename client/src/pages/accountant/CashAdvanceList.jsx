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
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import api from "~/utils/axios";

import {
  listAdvancesApi,
  updateCashAdvanceStatusApi,
  chiefApproveAdvanceApi,
  chiefRejectAdvanceApi,
  directorApproveAdvanceApi,
  directorRejectAdvanceApi,
} from "~/services/cash-advance.service";

import { renderAsync } from "docx-preview";
import SignatureCanvas from "react-signature-canvas";
import CashAdvanceFormDialog from "./CashAdvanceFormDialog";

/* ================== Helper chữ ký ================== */
function trimCanvasSafe(src) {
  if (!src) return null;
  const ctx = src.getContext("2d");
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;

  let top = h,
    left = w,
    right = 0,
    bottom = 0,
    hasInk = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a !== 0) {
        hasInk = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (!hasInk) return null;

  const tw = right - left + 1;
  const th = bottom - top + 1;
  const out = document.createElement("canvas");
  out.width = tw;
  out.height = th;
  const octx = out.getContext("2d");
  octx.putImageData(ctx.getImageData(left, top, tw, th), 0, 0);
  return out;
}

function getSignatureDataUrl(sigRef) {
  const base = sigRef?.current?.getCanvas?.();
  if (!base) return null;
  const trimmed = trimCanvasSafe(base);
  return (trimmed || base).toDataURL("image/png");
}

/* ================== File Preview ================== */
function FilePreviewDialog({ open, onClose, url }) {
  const API_BASE = (api?.defaults?.baseURL || "").replace(/\/$/, "");
  const href = useMemo(() => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return encodeURI(url);
    if (url.startsWith("/uploads")) return encodeURI(`${API_BASE}${url}`);
    return encodeURI(`${API_BASE}${url.startsWith("/") ? url : "/" + url}`);
  }, [url]);

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
      } catch {
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
              Preview not supported. Open directly:
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

/* ================== Review Dialog ================== */
function ReviewDialog({ open, onClose, onSubmit, mode, loading }) {
  const [note, setNote] = useState("");
  const sigRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setNote("");
      sigRef.current?.clear();
    }
  }, [open]);

  const needSignature = ["CHIEF_APPROVED", "DIRECTOR_APPROVED"].includes(mode);
  const showNote = mode.includes("REJECTED");

  const handleSubmit = () => {
    let signature = null;
    if (needSignature) {
      signature = getSignatureDataUrl(sigRef);
      if (!signature) {
        alert("Please sign before approving.");
        return;
      }
    }
    onSubmit(note, signature);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode.includes("APPROVED")
          ? "Approve Cash Advance"
          : "Reject Cash Advance"}
      </DialogTitle>
      <DialogContent dividers>
        {showNote ? (
          <TextField
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter a note..."
            fullWidth
            multiline
            minRows={3}
          />
        ) : needSignature ? (
          <>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Please sign below to approve this request:
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 1, width: "100%", height: 160, bgcolor: "#fff" }}
            >
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  width: 600,
                  height: 140,
                  style: { width: "100%", height: "140px" },
                }}
                backgroundColor="#fff"
                penColor="black"
              />
            </Paper>
            <Button onClick={() => sigRef.current?.clear()} sx={{ mt: 1 }}>
              Clear signature
            </Button>
          </>
        ) : (
          <Typography>You are about to approve this request.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={mode.includes("APPROVED") ? "success" : "error"}
          disabled={loading}
        >
          {loading
            ? "Submitting..."
            : mode.includes("APPROVED")
            ? "Approve"
            : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const STATUS_COLOR = (s) =>
  s === "APPROVED" || s === "APPROVED_DIRECTOR"
    ? "success"
    : s === "REJECTED"
    ? "error"
    : s?.startsWith("APPROVED")
    ? "info"
    : s === "PENDING"
    ? "info"
    : "default";

/* ================== Main ================== */
export default function CashAdvanceList() {
  const dispatch = useDispatch();
  const me = useSelector((state) => state.account.value);
  const myRole = me?.role;

  const isAccountant = myRole === "ACCOUNTANT" || myRole === "ADMIN";
  const isChief = myRole === "CHIEFACCOUNTANT" || myRole === "ADMIN";
  const isDirector = myRole === "MANAGER" || myRole === "ADMIN";

  const [view, setView] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState("APPROVED");
  const [reviewId, setReviewId] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      let params = { status: view === "ALL" ? "ALL" : view };
      if (view === "MY") params = { scope: "MY", status: "ALL" };

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
    }
  };

  useEffect(() => {
    fetchData();
  }, [view]);

  const openFile = (url) => {
    setViewerUrl(url || "");
    setViewerOpen(true);
  };

  const onReview = (id, mode) => {
    setReviewId(id);
    setReviewMode(mode);
    setReviewOpen(true);
  };

  const submitReview = async (note, signature) => {
    if (!reviewId) return;
    try {
      setReviewing(true);
      let res;
      if (reviewMode === "APPROVED") {
        res = await updateCashAdvanceStatusApi(reviewId, {
          status: "APPROVED",
          note: note?.trim() || undefined,
        });
      } else if (reviewMode === "CHIEF_APPROVED") {
        res = await chiefApproveAdvanceApi(reviewId, note, signature);
      } else if (reviewMode === "CHIEF_REJECTED") {
        res = await chiefRejectAdvanceApi(reviewId, note);
      } else if (reviewMode === "DIRECTOR_APPROVED") {
        res = await directorApproveAdvanceApi(reviewId, note, signature);
      } else if (reviewMode === "DIRECTOR_REJECTED") {
        res = await directorRejectAdvanceApi(reviewId, note);
      }

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
          setPopup({ type: "error", message: res?.message || "Update failed" })
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
        <Button
          variant="contained"
          color="primary"
          onClick={() => setFormOpen(true)}
        >
          + New Cash Advance
        </Button>

        <CashAdvanceFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={() => fetchData()}
        />
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
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
                  {/* ACCOUNTANT */}
                  {isAccountant && r.status === "PENDING" && (
                    <>
                      <Tooltip title="Approve (Accountant)">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onReview(r.id, "APPROVED")}
                            disabled={loading}
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
                            disabled={loading}
                          >
                            <CloseIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                  {/* CHIEF */}
                  {isChief &&
                    r.status === "APPROVED_ACCOUNTANT" &&
                    !r.chiefApprovedAt && (
                      <>
                        <Tooltip title="Approve (Chief Accountant)">
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => onReview(r.id, "CHIEF_APPROVED")}
                              disabled={loading}
                            >
                              <CheckIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Reject (Chief Accountant)">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onReview(r.id, "CHIEF_REJECTED")}
                              disabled={loading}
                            >
                              <CloseIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  {/* DIRECTOR */}
                  {isDirector &&
                    r.status === "APPROVED_CHIEF" &&
                    !!r.chiefApprovedAt &&
                    !r.directorApprovedAt && (
                      <>
                        <Tooltip title="Approve (Director)">
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                onReview(r.id, "DIRECTOR_APPROVED")
                              }
                              disabled={loading}
                            >
                              <CheckIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Reject (Director)">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                onReview(r.id, "DIRECTOR_REJECTED")
                              }
                              disabled={loading}
                            >
                              <CloseIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={9}
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
