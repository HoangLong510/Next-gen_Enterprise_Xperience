"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import HistoryIcon from "@mui/icons-material/History";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import {
  listEvidence,
  deleteEvidence,
} from "~/services/task-evidence.service.js";
import { createBranchForTask } from "~/services/task.service.js";
import { startGithubLogin, getGithubTokenStatus } from "~/services/github.service"; // 👈 OAuth helpers
import api from "~/utils/axios";
import AssignmentHistoryDialog from "./AssignmentHistoryDialog";

export default function TaskReviewDialog({
  open,
<<<<<<< Updated upstream
  task, // { ... , githubBranch?, pullRequestUrl?, merged?, mergedAt? }
  canUpload = false,
  onClose,
  onCancel, // (giữ để tương thích – không dùng ở đây)
  onUploaded, // async (files) => upload + (tuỳ) update status
  onUploading, // optional: set loading ở parent

  // khoá xoá evidence
  canClearEvidence = true,

  // PM accountId để xác định quyền tạo branch
  projectPmId, // number|string

  // repo đã link hay chưa (có thể là boolean hoặc string URL từ parent)
  repoLinked, // boolean | string | undefined
  // repoLink để tạo link mở branch (vd: https://github.com/owner/repo)
  repoLink, // string | undefined

  // callback cho parent cập nhật UI ngay sau khi tạo branch
  onBranchCreated, // (taskId: number, fullBranchName: string) => void
=======
  task,                   // { ... , githubBranch?, pullRequestUrl?, merged?, mergedAt? }
  canUpload = false,
  onClose,
  onCancel,               // optional: parent có thể dùng để refreshMeta
  onUploaded,             // (files[]) => Promise<void> | void   (cha xử lý upload + promote nếu cần)
  onUploading,            // (bool) => void
  canClearEvidence = true,
  projectPmId,
  repoLinked,
  repoLink,
  onBranchCreated,        // (taskId, fullBranchName) => void   (cha sẽ promote nếu cần)
  onUpdateTask,           // async ({id, name, description}) => {}
  readOnly = false,       // khi phase đã hoàn thành: PM/Manager/Admin chỉ xem, không edit
>>>>>>> Stashed changes
}) {
  const { t: tMsg } = useTranslation("messages");
  const { t: tTask } = useTranslation("task");
  const { t: tProject } = useTranslation("project");
  const { t: tPhases } = useTranslation("phases");

  const me = useSelector((s) => s.account?.value);

  // ====== Helper dịch key từ BE → i18n (ưu tiên: task → messages → project → phases) ======
  const tr = (key, fallback) => {
    const k = String(key || "");
    const tries = [tTask, tMsg, tProject, tPhases];
    for (const tFn of tries) {
      const out = tFn(k);
      if (out && out !== k) return out;
    }
    return fallback ?? k;
  };

  // ===== Evidence state =====
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [evidences, setEvidences] = useState([]);
  const [loadingEv, setLoadingEv] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // ===== Branch state =====
  const [branchName, setBranchName] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [branchMsg, setBranchMsg] = useState(null);
  const [localBranch, setLocalBranch] = useState(task?.githubBranch || null);

  // ===== Info edit state =====
  const [editName, setEditName] = useState(task?.name || "");
  const [editDesc, setEditDesc] = useState(task?.description || "");
  const [savingInfo, setSavingInfo] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // {type, text}
  const [shouldRefresh, setShouldRefresh] = useState(false); // báo parent refresh khi đóng

  // ===== History dialog =====
  const [openHistory, setOpenHistory] = useState(false);

  // ===== GitHub token status =====
  const [githubConnected, setGithubConnected] = useState(false);

  const API_BASE = (api?.defaults?.baseURL || "").replace(/\/$/, "");
  const ORIGIN = (() => {
  try {
    const u = new URL(API_BASE);
    return `${u.protocol}//${u.host}`;
  } catch {
    return API_BASE.replace(/\/api(?:\/|$).*/, "");
  }
})();

const normalizeUrl = (u = "") => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return encodeURI(u);
  // Server serve /uploads nằm dưới context-path (/api) -> ghép API_BASE
  if (u.startsWith("/uploads")) return encodeURI(`${API_BASE}${u}`);
  const right = u.startsWith("/") ? u : `/${u}`;
  return encodeURI(`${API_BASE}${right}`);
};
  const toUrl = (u = "") => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/uploads")) return `${ORIGIN}${u}`;
  return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
};

  // Load evidence mỗi khi mở dialog / đổi task
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

  // Sync local branch + editable fields khi đổi task/open
  useEffect(() => {
    setLocalBranch(task?.githubBranch || null);
    setEditName(task?.name || "");
    setEditDesc(task?.description || "");
    setSaveMsg(null);
    setShouldRefresh(false);
  }, [task?.githubBranch, task?.name, task?.description, open]);

  // Check GitHub token status khi dialog mở
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const ok = await getGithubTokenStatus();
        setGithubConnected(!!ok);
      } catch {
        setGithubConnected(false);
      }
    })();
  }, [open]);

  // Sau khi OAuth quay lại: nếu có flag ?github=connected → xác thực lại token,
  // và nếu có pendingBranchName/pendingBranchTaskId khớp task hiện tại thì auto-create branch.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("github") !== "connected") return;

    (async () => {
      try {
        const ok = await getGithubTokenStatus();
        setGithubConnected(!!ok);

        const savedName = sessionStorage.getItem("pendingBranchName") || "";
        const savedTaskId = sessionStorage.getItem("pendingBranchTaskId");

        if (ok && savedName && savedTaskId && task?.id && Number(savedTaskId) === Number(task.id)) {
          // Auto create branch sau khi đã login
          const clean = savedName.trim().replace(/\s+/g, "-").toLowerCase();
          setCreatingBranch(true);
          setBranchMsg(null);
          try {
            const res = await createBranchForTask(task.id, { branchName: clean });
            // res từ axios → res.data là ApiResponse; vẫn cứ check .status cho hợp code cũ nếu bạn đang set thế
            if (res?.status === 200 || res?.success) {
              const full = `${clean}-task-${task.id}`;
              setLocalBranch(full);
              setBranchMsg({
                type: "success",
                text: tTask("branch-created-success", { branch: full }),
              });
              onBranchCreated?.(task.id, full);
              setShouldRefresh(true);
            } else {
              const serverKey = res?.message || res?.data?.message;
              setBranchMsg({
                type: "error",
                text: tr(serverKey, tTask("branch-created-failed")),
              });
            }
          } catch (e) {
            const serverKey =
              e?.response?.data?.message ||
              e?.response?.data?.error ||
              "branch-created-failed";
            setBranchMsg({ type: "error", text: tr(serverKey, tTask("branch-created-failed")) });
          } finally {
            setCreatingBranch(false);
          }
        }
      } finally {
        // Dọn session & xoá query param
        sessionStorage.removeItem("pendingBranchName");
        sessionStorage.removeItem("pendingBranchTaskId");
        url.searchParams.delete("github");
        const cleanUrl =
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
        window.history.replaceState({}, "", cleanUrl);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

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
      // Cha sẽ upload + (nếu cần) promote sang IN_REVIEW luôn
      await onUploaded(files);
      setFiles([]);

      // Reload danh sách evidence trong dialog để hiển thị ngay
      const items = await listEvidence(task.id);
      setEvidences(items || []);

      // Nếu muốn đóng dialog ngay khi đã upload xong, bật dòng dưới:
      // onClose?.(true);
    } finally {
      setSubmitting(false);
      onUploading?.(false);
    }
  };

  const askDelete = (id) => {
    if (!canClearEvidence) return;
    setConfirmDeleteId(id);
  };

  const confirmDeleteOne = async () => {
<<<<<<< Updated upstream
    if (!canClearEvidence) return;
    if (!confirmDeleteId) return;
=======
    if (!canClearEvidence || !confirmDeleteId) return;
>>>>>>> Stashed changes
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

  const askClearAll = () => {
    if (!canClearEvidence) return;
    setConfirmClearOpen(true);
  };

  const confirmClearAll = async () => {
    if (!canClearEvidence) return setConfirmClearOpen(false);
    if (!evidences.length) return setConfirmClearOpen(false);
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
    s
      ?.toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());

  // ===== Quyền =====
  const isPM = useMemo(
    () => !!projectPmId && !!me?.id && Number(me.id) === Number(projectPmId),
    [projectPmId, me?.id]
  );

  const isAssignee = useMemo(
    () =>
      !!task?.assigneeUsername &&
      !!me?.username &&
      task.assigneeUsername === me.username,
    [task?.assigneeUsername, me?.username]
  );

<<<<<<< Updated upstream
  // Repo đã link? (support: boolean hoặc string URL)
  const isRepoLinked = useMemo(
    () => !!repoLink || !!repoLinked,
    [repoLink, repoLinked]
  );

  // Block khi task đã Completed/Canceled
=======
  const isRepoLinked = useMemo(() => !!repoLink || !!repoLinked, [repoLink, repoLinked]);
>>>>>>> Stashed changes
  const isBlockedByStatus = useMemo(
    () => ["COMPLETED", "CANCELED"].includes(task?.status),
    [task?.status]
  );

<<<<<<< Updated upstream
  //Chỉ hiện khu Create Branch khi: PM/Assignee + chưa có branch + ĐÃ LINK REPO
  const showCreateBranchSection =
    (isPM || isAssignee) && !localBranch && isRepoLinked;

  // Có thể nhấn "Create Branch" hay không
  const canCreateBranch =
    (isPM || isAssignee) && !localBranch && isRepoLinked && !isBlockedByStatus;

  // Build link mở branch trên GitHub nếu có repoLink + branch
=======
  // Khoá các vùng không liên quan đến evidence đối với EMP/HOD hoặc khi readOnly
  const lockNonEvidenceAreas = useMemo(
    () => readOnly || ["EMPLOYEE", "HOD"].includes(me?.role),
    [me?.role, readOnly]
  );
  const canEditInfo = !lockNonEvidenceAreas;

  // Điều kiện hiển thị / cho phép tạo branch
  const showCreateBranchSection = (isPM || isAssignee) && !localBranch && isRepoLinked;
  const canCreateBranch = (isPM || isAssignee)
    && !localBranch
    && isRepoLinked
    && !isBlockedByStatus
    && !readOnly; // cho phép bấm; nếu chưa login sẽ chuyển qua flow login ngay

>>>>>>> Stashed changes
  const branchUrl = useMemo(() => {
    if (!repoLink || !localBranch) return null;
    const base = repoLink.replace(/\.git$/i, "");
    return `${base}/tree/${encodeURIComponent(localBranch)}`;
  }, [repoLink, localBranch]);

  useEffect(() => {
    if (!open) {
      setBranchName("");
      setBranchMsg(null);
      setCreatingBranch(false);
    }
  }, [open]);

  const statusLabel = useMemo(() => {
    const key = `statusLabel.${task?.status}`;
    const translated = tProject(key);
    return translated && translated !== key ? translated : prettyStatus(task?.status);
  }, [task?.status, tProject]);

  // ===== Save task info (name/description)
  const dirty = useMemo(
    () => (task?.name || "") !== editName || (task?.description || "") !== editDesc,
    [task?.name, task?.description, editName, editDesc]
  );

  const handleSaveInfo = async () => {
    if (!canEditInfo || !task?.id || !dirty) return;
    setSavingInfo(true);
    setSaveMsg(null);
    try {
      if (onUpdateTask) {
        await onUpdateTask({ id: task.id, name: editName, description: editDesc });
      } else {
        await api.put(`/tasks/${task.id}`, {
          name: editName,
          description: editDesc,
        });
      }
      setSaveMsg({ type: "success", text: tTask("save-changes") + " ✓" });
      setShouldRefresh(true);
    } catch (e) {
      console.error("save task info failed", e);
      setSaveMsg({ type: "error", text: "Failed to save changes." });
    } finally {
      setSavingInfo(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={() => onClose?.(shouldRefresh)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {canUpload ? tTask("submit-evidence-title") : tTask("view-evidence-title")}
        </DialogTitle>

<<<<<<< Updated upstream
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
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
            >
              Description
            </Typography>

            <Box
              sx={{
                p: 1.25,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                maxHeight: 280,
                overflowY: "auto",
                backgroundColor: "background.paper",
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                // chặn hoàn toàn thẻ <img> trong markdown
                components={{
                  img: () => null,
                  a: ({ node, ...props }) => (
                    <Link
                      href={normalizeUrl(props.href || "")}
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                    >
                      {props.children}
                    </Link>
                  ),
                }}
              >
                {(task?.description ?? "").replace(/\r\n/g, "\n")}
              </ReactMarkdown>
            </Box>
          </Box>

          {/* Ảnh riêng bên dưới mô tả nếu có imageUrl */}
          {task?.imageUrl && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
              >
                Image
              </Typography>
              <img
                src={normalizeUrl(task.imageUrl)}
                alt="task attachment"
                style={{
                  maxWidth: "100%",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: "rgba(0,0,0,0.12)",
                }}
                loading="lazy"
              />
            </Box>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            {task?.size && (
              <Chip
                label={`Size: ${task.size}`}
                size="small"
                variant="outlined"
              />
            )}
            {task?.status && (
              <Chip
                label={prettyStatus(task.status)}
                size="small"
                color="info"
              />
            )}
            {task?.deadline && (
              <Typography variant="caption" color="text.secondary">
                Deadline: {dayjs(task.deadline).format("YYYY-MM-DD")}
              </Typography>
            )}
          </Stack>

          {task?.assigneeName && (
=======
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* ===== Thông tin Task ===== */}
            {!!saveMsg && <Alert severity={saveMsg.type}>{saveMsg.text}</Alert>}

>>>>>>> Stashed changes
            <Box>
              <TextField
                label={tTask("task-name")}
                value={editName}
                onChange={(e) => canEditInfo && setEditName(e.target.value)}
                size="small"
                fullWidth
                disabled={!canEditInfo}
              />
              <TextField
                sx={{ mt: 1.25 }}
                label={tTask("task-description")}
                value={editDesc}
                onChange={(e) => canEditInfo && setEditDesc(e.target.value)}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={!canEditInfo}
              />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                {task?.size && (
                  <Chip
                    label={tProject("sizeLabel", { value: task.size })}
                    size="small"
                    variant="outlined"
                  />
                )}
                {task?.status && <Chip label={statusLabel} size="small" color="info" />}
                {task?.deadline && (
                  <Typography variant="caption" color="text.secondary">
                    {tProject("deadlineLabel")}: {dayjs(task.deadline).format("YYYY-MM-DD")}
                  </Typography>
                )}
              </Stack>

              {task?.assigneeName && (
                <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {tTask("assignee")}
                    </Typography>
                    <Typography variant="body2">
                      {task.assigneeName}
                      {task.assigneeUsername ? ` (@${task.assigneeUsername})` : ""}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setOpenHistory(true)}
                    title={tTask("view-assignment-history")}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>

<<<<<<< Updated upstream
          {/* ====== Branch info (nếu đã tạo) ====== */}
          {localBranch && (
            <Alert severity={task?.merged ? "success" : "info"}>
              Branch đã tạo: <strong>{localBranch}</strong>
              {branchUrl && (
                <>
                  {" • "}
                  <Link
                    href={branchUrl}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                  >
                    Mở trên GitHub
                  </Link>
                </>
              )}
              {task?.pullRequestUrl && (
                <>
                  {" • PR: "}
                  <Link
                    href={task.pullRequestUrl}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                  >
                    {task.pullRequestUrl}
                  </Link>
                </>
              )}
              {task?.merged && task?.mergedAt && (
                <>
                  {" "}
                  • Merged at: {dayjs(task.mergedAt).format("YYYY-MM-DD HH:mm")}
                </>
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
                  disabled={
                    creatingBranch || !branchName.trim() || !canCreateBranch
                  }
=======
            {/* ===== Nút Save cho phần info ===== */}
            {canEditInfo && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  disabled={!dirty || savingInfo}
                  onClick={handleSaveInfo}
>>>>>>> Stashed changes
                >
                  {tTask("save-changes")}
                </Button>
<<<<<<< Updated upstream
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
                  const url = normalizeUrl(ev.url);
                  return (
                    <Box
                      key={ev.id}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      {isImage && url && (
                        <img
                          src={url}
                          alt={ev.fileName}
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
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
                          {ev.uploadedAt
                            ? ` • ${dayjs(ev.uploadedAt).format(
                                "YYYY-MM-DD HH:mm"
                              )}`
                            : ""}
                          {ev.uploadedBy ? ` • by ${ev.uploadedBy}` : ""}
                        </Typography>
                      </Box>

                      {url && (
                        <Link
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          underline="hover"
                        >
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
=======
              </Box>
>>>>>>> Stashed changes
            )}

            <Divider />

<<<<<<< Updated upstream
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
            <Button
              variant="outlined"
              component="label"
              size="small"
              disabled={!canUpload}
            >
              Chọn files
              <input
                hidden
                type="file"
                multiple
                onChange={handlePick}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              />
            </Button>

            <Stack
              spacing={0.5}
              sx={{ mt: 1, maxHeight: 160, overflowY: "auto" }}
            >
              {files.length ? (
                files.map((f, i) => (
                  <Typography key={i} variant="caption">
                    • {f.name} ({Math.round(f.size / 1024)} KB)
                  </Typography>
                ))
=======
            {/* ===== CREATE BRANCH ===== */}
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
                    label={tTask("branch-name-prefix")}
                    placeholder={tTask("branch-placeholder")}
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    sx={{ flex: 1, minWidth: 220 }}
                    disabled={creatingBranch || !canCreateBranch}
                  />
                  <Button
                    variant="contained"
                    onClick={async () => {
                      setBranchMsg(null);
                      const raw = (branchName || "").trim();
                      if (!raw) {
                        setBranchMsg({ type: "error", text: tTask("branch-name-required") });
                        return;
                      }

                      // Nếu chưa connect GitHub → đi login ngay và quay lại
                      if (!githubConnected) {
                        // Lưu tạm tên branch & taskId để auto tạo sau khi quay lại
                        sessionStorage.setItem("pendingBranchName", raw);
                        sessionStorage.setItem("pendingBranchTaskId", String(task.id || ""));
                        await startGithubLogin({
                          context: "task",
                          id: Number(task.id),
                          redirect: window.location.href, // quay lại đúng trang/dialog
                        });
                        return; // việc còn lại xử lý ở useEffect (github=connected)
                      }

                      const clean = raw.replace(/\s+/g, "-").toLowerCase();
                      setCreatingBranch(true);
                      try {
                        const res = await createBranchForTask(task.id, { branchName: clean });
                        if (res?.status === 200 || res?.success) {
                          const full = `${clean}-task-${task.id}`;
                          setLocalBranch(full);
                          setBranchMsg({
                            type: "success",
                            text: tTask("branch-created-success", { branch: full }),
                          });
                          onBranchCreated?.(task.id, full);
                          setShouldRefresh(true);
                          // Nếu muốn auto-close sau khi tạo, mở dòng dưới:
                          // onClose?.(true);
                        } else {
                          const serverKey = res?.message || res?.data?.message;
                          setBranchMsg({
                            type: "error",
                            text: tr(serverKey, tTask("branch-created-failed")),
                          });
                        }
                      } catch (e) {
                        const serverKey =
                          e?.response?.data?.message ||
                          e?.response?.data?.error ||
                          "branch-created-failed";
                        setBranchMsg({ type: "error", text: tr(serverKey, tTask("branch-created-failed")) });
                      } finally {
                        setCreatingBranch(false);
                      }
                    }}
                    disabled={creatingBranch || !branchName.trim() || !canCreateBranch}
                  >
                    {creatingBranch ? tTask("creating") : tTask("create-branch")}
                  </Button>
                </Stack>

                {branchMsg && <Alert severity={branchMsg.type} sx={{ mt: 1 }}>{branchMsg.text}</Alert>}
              </Box>
            )}

            {localBranch && (
              <Alert severity={task?.merged ? "success" : "info"}>
                {tTask("branch-created-label")}: <strong>{localBranch}</strong>
                {repoLink && (
                  <>
                    {" • "}
                    <Link
                      href={`${repoLink.replace(/\.git$/i, "")}/tree/${encodeURIComponent(localBranch)}`}
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                    >
                      {tProject("githubOpen")}
                    </Link>
                  </>
                )}
                {task?.pullRequestUrl && (
                  <>
                    {" • "}{tTask("pr")}:{" "}
                    <Link href={task.pullRequestUrl} target="_blank" rel="noreferrer" underline="hover">
                      {task.pullRequestUrl}
                    </Link>
                  </>
                )}
                {task?.merged && task?.mergedAt && (
                  <> • {tTask("merged-at")}: {dayjs(task.mergedAt).format("YYYY-MM-DD HH:mm")}</>
                )}
              </Alert>
            )}

            <Divider />

            {/* ===== Evidence ===== */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{tTask("uploaded-evidence")}</Typography>

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
                  {tTask("loading")}
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
                          <video src={url} style={{ width: 100, height: 56, borderRadius: 4 }} controls />
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
                            {tTask("view")}
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
>>>>>>> Stashed changes
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {tTask("no-evidence")}
                </Typography>
              )}
            </Box>

<<<<<<< Updated upstream
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{tPhases("close")}</Button>
        {canUpload && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Gửi evidence
          </Button>
        )}
      </DialogActions>
=======
            <Divider />
>>>>>>> Stashed changes

            {/* ===== Upload area ===== */}
            <Box sx={{ opacity: canUpload ? 1 : 0.5, pointerEvents: canUpload ? "auto" : "none" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {tTask("add-evidence")}
              </Typography>
              <Button variant="outlined" component="label" size="small" disabled={!canUpload}>
                {tTask("choose-files")}
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
                    {tTask("no-file-selected")}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
<<<<<<< Updated upstream
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteId(null)}
            variant="outlined"
            color="inherit"
          >
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
=======

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => onClose?.(shouldRefresh)}>{tTask("close")}</Button>
          {canUpload && (
            <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
              {tTask("submit-evidence")}
            </Button>
          )}
>>>>>>> Stashed changes
        </DialogActions>

        {/* Confirm: delete one */}
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

<<<<<<< Updated upstream
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
          <Button
            onClick={() => setConfirmClearOpen(false)}
            variant="outlined"
            color="inherit"
          >
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
=======
      <AssignmentHistoryDialog
        open={openHistory}
        taskId={task?.id}
        onClose={() => setOpenHistory(false)}
      />
    </>
>>>>>>> Stashed changes
  );
}
