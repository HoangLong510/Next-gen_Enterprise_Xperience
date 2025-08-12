// src/components/project/form/TaskReviewDialog.jsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  Chip,
  Typography,
  Box,
  Divider,
  Link,
  IconButton,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import GitHubIcon from "@mui/icons-material/GitHub";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { listEvidence, deleteEvidence } from "~/services/task-evidence.service.js";
import { createBranchForTask } from "~/services/task.service.js";
import api from "~/utils/axios";

export default function TaskReviewDialog({
  open,
  task,                  // { ... , githubBranch?, pullRequestUrl?, merged?, mergedAt? }
  canUpload = false,
  onClose,
  onCancel,              // (giữ để tương thích – không dùng ở đây)
  onUploaded,            // async (files) => upload + (tuỳ) update status
  onUploading,           // optional: set loading ở parent

  // khoá xoá evidence
  canClearEvidence = true,

  // PM accountId để xác định quyền tạo branch
  projectPmId,            // number|string

  // repo đã link hay chưa (có thể là boolean hoặc string URL từ parent)
  repoLinked,             // boolean | string | undefined
  // repoLink để tạo link mở branch (vd: https://github.com/owner/repo)
  repoLink,               // string | undefined

  // callback cho parent cập nhật UI ngay sau khi tạo branch
  onBranchCreated,        // (taskId: number, fullBranchName: string) => void
}) {
  const { t: tMsg } = useTranslation("messages");
  const { t: tPhases } = useTranslation("phases");

  // current account từ Redux
  const me = useSelector((s) => s.account?.value);

  // ===== Evidence state =====
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [evidences, setEvidences] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);

  // Xác nhận xoá 1 file
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Xác nhận clear all
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // ===== Branch state =====
  const [branchName, setBranchName] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchMsg, setBranchMsg] = useState(null); // {type: 'success'|'error'|'info', text: string}
  const [localBranch, setLocalBranch] = useState(task?.githubBranch || null);

  // Build URL tuyệt đối từ baseURL (đã include context-path nếu có)
  const API_BASE = (api?.defaults?.baseURL || "").replace(/\/$/, "");
  const toUrl = (u) => (u?.startsWith("http") ? u : API_BASE + u);

  // Load danh sách evidence khi mở dialog hoặc đổi task
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!open || !task?.id) return;
      try {
        setLoadingEv(true);
        const items = await listEvidence(task.id);
        if (mounted) setEvidences(items || []);
      } finally {
        if (mounted) setLoadingEv(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [open, task?.id]);

  // Sync localBranch khi mở dialog / đổi task
  useEffect(() => {
    setLocalBranch(task?.githubBranch || null);
  }, [task?.githubBranch, open]);

  const handlePick = (e) => setFiles(Array.from(e.target.files || []));

  const canSubmit = useMemo(
    () => canUpload && files.length > 0 && !submitting,
    [files, submitting, canUpload]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    onUploading?.(true);
    try {
      await onUploaded(files); // parent lo upload + (tuỳ) update status
      setFiles([]);
      // Refresh list sau upload
      const items = await listEvidence(task.id);
      setEvidences(items || []);
    } finally {
      setSubmitting(false);
      onUploading?.(false);
    }
  };

  // Hỏi xác nhận xoá 1 file
  const askDelete = (id) => {
    if (!canClearEvidence) return; // ⛔ bị khoá
    setConfirmDeleteId(id);
  };

  // Thực thi xoá 1 file sau khi confirm
  const confirmDeleteOne = async () => {
    if (!canClearEvidence) return; // ⛔ bị khoá
    if (!confirmDeleteId) return;
    try {
      setDeletingId(confirmDeleteId);
      await deleteEvidence(confirmDeleteId);
      setEvidences((prev) => prev.filter((x) => x.id !== confirmDeleteId));
    } catch (e) {
      console.error("delete evidence failed", e);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Hỏi xác nhận clear all
  const askClearAll = () => {
    if (!canClearEvidence) return; // ⛔ bị khoá
    setConfirmClearOpen(true);
  };

  // Thực thi clear all
  const confirmClearAll = async () => {
    if (!canClearEvidence) {
      setConfirmClearOpen(false);
      return;
    }
    if (!evidences.length) {
      setConfirmClearOpen(false);
      return;
    }
    setClearingAll(true);
    try {
      await Promise.allSettled(evidences.map((ev) => deleteEvidence(ev.id)));
      setEvidences([]);
    } catch (e) {
      console.error("clear all evidences failed", e);
    } finally {
      setClearingAll(false);
      setConfirmClearOpen(false);
    }
  };

  const prettyStatus = (s) =>
    s?.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  // ====== Quyền/điều kiện tạo branch ======
  const isPM = useMemo(
    () => !!projectPmId && !!me?.id && Number(me.id) === Number(projectPmId),
    [projectPmId, me?.id]
  );

  const isAssignee = useMemo(
    () => !!task?.assigneeUsername && !!me?.username && task.assigneeUsername === me.username,
    [task?.assigneeUsername, me?.username]
  );

  // Repo đã link? (support: boolean hoặc string URL)
  const isRepoLinked = useMemo(
    () => !!repoLink || !!repoLinked,
    [repoLink, repoLinked]
  );

  // ⛔ Block khi task đã Completed/Canceled
  const isBlockedByStatus = useMemo(
    () => ["COMPLETED", "CANCELED"].includes(task?.status),
    [task?.status]
  );

  // ✅ Chỉ hiện khu Create Branch khi: PM/Assignee + chưa có branch + ĐÃ LINK REPO
  const showCreateBranchSection = (isPM || isAssignee) && !localBranch && isRepoLinked;

  // Có thể nhấn "Create Branch" hay không
  const canCreateBranch = (isPM || isAssignee) && !localBranch && isRepoLinked && !isBlockedByStatus;

  // Build link mở branch trên GitHub nếu có repoLink + branch
  const branchUrl = useMemo(() => {
    if (!repoLink || !localBranch) return null;
    const base = repoLink.replace(/\.git$/i, "");
    return `${base}/tree/${encodeURIComponent(localBranch)}`;
  }, [repoLink, localBranch]);

  // ====== Create Branch ======
  const handleCreateBranch = async () => {
    setBranchMsg(null);
    if (!task?.id) return;

    const raw = (branchName || "").trim();
    if (!raw) {
      setBranchMsg({ type: "error", text: "Vui lòng nhập tên branch." });
      return;
    }

    const clean = raw.replace(/\s+/g, "-").toLowerCase();

    setCreatingBranch(true);
    try {
      const res = await createBranchForTask(task.id, { branchName: clean });
      if (res?.status === 200) {
        const full = `${clean}-task-${task.id}`;
        setLocalBranch(full);
        setBranchMsg({
          type: "success",
          text: `Đã tạo branch: ${full}. Hãy push commit & mở PR để được auto-detect merge.`,
        });
        onBranchCreated?.(task.id, full);
      } else {
        setBranchMsg({
          type: "error",
          text: res?.message || "Tạo branch thất bại.",
        });
      }
    } catch (e) {
      setBranchMsg({ type: "error", text: "Tạo branch thất bại." });
    } finally {
      setCreatingBranch(false);
    }
  };

  // Reset branch form khi đóng
  useEffect(() => {
    if (!open) {
      setBranchName("");
      setBranchMsg(null);
      setCreatingBranch(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {canUpload ? "Submit evidence for review" : "Evidence của task"}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Thông tin task */}
          <TextField
            label="Task name"
            value={task?.name || ""}
            size="small"
            fullWidth
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Description"
            value={task?.description || ""}
            size="small"
            fullWidth
            multiline
            minRows={2}
            InputProps={{ readOnly: true }}
          />

          <Stack direction="row" spacing={1} alignItems="center">
            {task?.size && (
              <Chip label={`Size: ${task.size}`} size="small" variant="outlined" />
            )}
            {task?.status && (
              <Chip label={prettyStatus(task.status)} size="small" color="info" />
            )}
            {task?.deadline && (
              <Typography variant="caption" color="text.secondary">
                Deadline: {dayjs(task.deadline).format("YYYY-MM-DD")}
              </Typography>
            )}
          </Stack>

          {task?.assigneeName && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Assignee
              </Typography>
              <Typography variant="body2">
                {task.assigneeName}
                {task.assigneeUsername ? ` (@${task.assigneeUsername})` : ""}
              </Typography>
            </Box>
          )}

          {/* ====== Branch info (nếu đã tạo) ====== */}
          {localBranch && (
            <Alert severity={task?.merged ? "success" : "info"}>
              Branch đã tạo: <strong>{localBranch}</strong>
              {branchUrl && (
                <>
                  {" • "}
                  <Link href={branchUrl} target="_blank" rel="noreferrer" underline="hover">
                    Mở trên GitHub
                  </Link>
                </>
              )}
              {task?.pullRequestUrl && (
                <>
                  {" • PR: "}
                  <Link href={task.pullRequestUrl} target="_blank" rel="noreferrer" underline="hover">
                    {task.pullRequestUrl}
                  </Link>
                </>
              )}
              {task?.merged && task?.mergedAt && (
                <> • Merged at: {dayjs(task.mergedAt).format("YYYY-MM-DD HH:mm")}</>
              )}
            </Alert>
          )}

          <Divider />

          {/* ====== Create Branch (CHỈ hiển thị khi đã link repo) ====== */}
          {showCreateBranchSection && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: "1px dashed rgba(0,0,0,0.12)",
                bgcolor: "rgba(0,0,0,0.02)",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  size="small"
                  label="Branch name (prefix)"
                  placeholder="feature/login"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  sx={{ flex: 1, minWidth: 220 }}
                  disabled={creatingBranch || !canCreateBranch}
                />
                <Button
                  variant="contained"
                  onClick={handleCreateBranch}
                  disabled={creatingBranch || !branchName.trim() || !canCreateBranch}
                >
                  {creatingBranch ? "Đang tạo..." : "Create Branch"}
                </Button>
              </Stack>

              {branchMsg && (
                <Alert severity={branchMsg.type} sx={{ mt: 1 }}>
                  {branchMsg.text}
                </Alert>
              )}
            </Box>
          )}

          <Divider />

          {/* Evidence list */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">Evidence đã upload</Typography>

              {canClearEvidence && (
                <Button
                  color="error"
                  variant="outlined"
                  size="small"
                  onClick={askClearAll}
                  disabled={!evidences.length || clearingAll || loadingEv}
                >
                  {tMsg("clear-all-evidence")}
                </Button>
              )}
            </Stack>

            {loadingEv ? (
              <Typography variant="caption" color="text.secondary">
                Đang tải...
              </Typography>
            ) : evidences?.length ? (
              <Stack spacing={1} sx={{ maxHeight: 240, overflowY: "auto" }}>
                {evidences.map((ev) => {
                  const isImage = ev.contentType?.startsWith?.("image/");
                  const isVideo = ev.contentType?.startsWith?.("video/");
                  const url = toUrl(ev.url);
                  return (
                    <Box key={ev.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {isImage && url && (
                        <img
                          src={url}
                          alt={ev.fileName}
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4 }}
                        />
                      )}

                      {isVideo && url && (
                        <video
                          src={url}
                          style={{ width: 100, height: 56, borderRadius: 4 }}
                          controls
                        />
                      )}

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap title={ev.fileName}>
                          {ev.fileName || "file"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ev.size ? `${Math.round(ev.size / 1024)} KB` : ""}
                          {ev.uploadedAt ? ` • ${dayjs(ev.uploadedAt).format("YYYY-MM-DD HH:mm")}` : ""}
                          {ev.uploadedBy ? ` • by ${ev.uploadedBy}` : ""}
                        </Typography>
                      </Box>

                      {url && (
                        <Link href={url} target="_blank" rel="noreferrer" underline="hover">
                          Xem
                        </Link>
                      )}

                      {canUpload && canClearEvidence && (
                        <IconButton
                          size="small"
                          onClick={() => askDelete(ev.id)}
                          aria-label="delete"
                          disabled={deletingId === ev.id}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Chưa có evidence.
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Khu upload (disable nếu không được phép) */}
          <Box
            sx={{
              opacity: canUpload ? 1 : 0.5,
              pointerEvents: canUpload ? "auto" : "none",
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Thêm evidence
            </Typography>
            <Button variant="outlined" component="label" size="small" disabled={!canUpload}>
              Chọn files
              <input
                hidden
                type="file"
                multiple
                onChange={handlePick}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              />
            </Button>

            <Stack spacing={0.5} sx={{ mt: 1, maxHeight: 160, overflowY: "auto" }}>
              {files.length ? (
                files.map((f, i) => (
                  <Typography key={i} variant="caption">
                    • {f.name} ({Math.round(f.size / 1024)} KB)
                  </Typography>
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Chưa chọn file.
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{tPhases("close")}</Button>
        {canUpload && (
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
            Gửi evidence
          </Button>
        )}
      </DialogActions>

      {/* Confirm: xoá 1 file */}
      <Dialog
        open={!!confirmDeleteId && canClearEvidence}
        onClose={() => setConfirmDeleteId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{tMsg("confirm-delete-evidence-title")}</DialogTitle>
        <DialogContent>
          <Typography>{tMsg("confirm-delete-evidence-message")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)} variant="outlined" color="inherit">
            {tPhases("cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteOne}
            disabled={deletingId === confirmDeleteId}
          >
            {tPhases("confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm: clear all */}
      <Dialog
        open={confirmClearOpen && canClearEvidence}
        onClose={() => setConfirmClearOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{tMsg("confirm-clear-evidence-title")}</DialogTitle>
        <DialogContent>
          <Typography>{tMsg("confirm-clear-evidence-message")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)} variant="outlined" color="inherit">
            {tPhases("cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmClearAll}
            disabled={clearingAll || !evidences.length}
          >
            {tPhases("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
