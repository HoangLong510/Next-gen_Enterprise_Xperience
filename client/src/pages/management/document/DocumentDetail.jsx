"use client";

import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Divider,
  alpha,
  useTheme,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  TextField,
} from "@mui/material";
import {
  Person,
  Work,
  CalendarToday,
  InfoOutlined,
  Download,
  Edit,
  FilePresent,
} from "@mui/icons-material";
import { useEffect, useState, useRef } from "react";
import HistoryIcon from "@mui/icons-material/History";
import { Link, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import {
  fetchDocumentDetailApi,
  downloadDocumentFileApi,
  signDocumentApi,
  addManagerNoteApi,
  updateDocumentStatusApi,
} from "~/services/document.service";
import SignatureCanvas from "react-signature-canvas";
import ProjectFormCreate from "~/components/project/form/ProjectFormCreate";
import { useTranslation } from "react-i18next";

export default function DocumentDetail() {
  const { id } = useParams();
  const theme = useTheme();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signError, setSignError] = useState("");
  const signaturePadRef = useRef(null);
  const account = useSelector((state) => state.account.value);
  const dispatch = useDispatch();
  const { t } = useTranslation("document_detail");

  // NOTE của giám đốc
  const [managerNote, setManagerNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await fetchDocumentDetailApi(id);
    if (res.status === 200) {
      setDoc(res.data);
      if (account?.role !== "MANAGER") {
        setManagerNote(
          typeof res.data?.managerNote === "string" ? res.data.managerNote : ""
        );
      }
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Load document failed",
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    fetchDetail();
  }, [id, account?.role]);

  const handleUpdateStatus = async () => {
    const res = await updateDocumentStatusApi(doc.id, "COMPLETED");
    if (res.status === 200) {
      dispatch(
        setPopup({
          type: "success",
          message: "Update Document Sucessfully!",
        })
      );
      fetchDetail();
    } else {
      dispatch(
        setPopup({ type: "error", message: res.message || "Update Fail" })
      );
    }
  };

  const handleDownload = async () => {
    if (!doc?.fileUrl) return;
    setDownloading(true);
    try {
      const res = await downloadDocumentFileApi(id);
      if (res && res.data) {
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileUrl.split("/").pop() || `document_${id}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Download failed");
      }
    } catch {
      alert("An error occurred while downloading the file");
    }
    setDownloading(false);
  };

  const handleSign = () => setSignDialogOpen(true);

  const handleSaveSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setSignError("Bạn cần ký vào ô bên dưới!");
      return;
    }
    setSignError("");
    const signatureBase64 = signaturePadRef.current.toDataURL();
    setLoading(true);
    const res = await signDocumentApi(id, signatureBase64);
    setLoading(false);
    setSignDialogOpen(false);
    if (res.status === 200) {
      dispatch(
        setPopup({ type: "success", message: "Ký công văn thành công" })
      );
      fetchDetail();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Ký công văn thất bại!",
        })
      );
    }
  };

  // Gửi ghi chú của MANAGER
  const handleSubmitNote = async () => {
    if (!managerNote.trim()) {
      dispatch(setPopup({ type: "error", message: "Vui lòng nhập ghi chú" }));
      return;
    }
    setNoteSaving(true);
    const res = await addManagerNoteApi(id, managerNote.trim());
    setNoteSaving(false);
    if (res.status === 200) {
      dispatch(
        setPopup({ type: "success", message: "Đã gửi ghi chú cho thư ký" })
      );
      // Hiển thị ngay trên UI
      setDoc((prev) =>
        prev ? { ...prev, managerNote: managerNote.trim() } : prev
      );
      // Xoá nội dung ô nhập để tránh gửi lại
      setManagerNote("");
      // Tuỳ chọn: sync lại từ server (an toàn vì fetchDetail không đổ vào input khi role=MANAGER)
      fetchDetail();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Gửi ghi chú thất bại!",
        })
      );
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );

  if (!doc)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Typography
          color="text.secondary"
          sx={{ fontSize: 22, fontWeight: 600, textAlign: "center" }}
        >
          Document not found.
        </Typography>
      </Box>
    );

  return (
    <>
      <Box sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
        <Paper
          elevation={12}
          sx={{
            borderRadius: 4,
            background: `linear-gradient(145deg, ${alpha(
              theme.palette.background.paper,
              0.95
            )}, ${alpha(theme.palette.primary.light, 0.15)})`,
            boxShadow: `0 25px 50px ${alpha(theme.palette.primary.main, 0.25)}`,
            overflow: "hidden",
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              color: "white",
              p: { xs: 2, sm: 3, md: 3 },
              textAlign: "center",
            }}
          >
            <FilePresent
              sx={{
                fontSize: { xs: 30, sm: 40, md: 45 },
                mb: 1,
                opacity: 0.85,
              }}
            />
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                letterSpacing: 0.5,
                fontSize: {
                  xs: "1.2rem",
                  sm: "1.6rem",
                  md: "2rem",
                  lg: "2.4rem",
                },
                lineHeight: 1.1,
                textShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }}
            >
              {doc.title}
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            {doc.previewHtml && (
              <Card
                elevation={4}
                sx={{
                  mb: 4,
                  borderRadius: 3,
                  overflow: "hidden",
                  border: `2px solid ${theme.palette.primary.light}`,
                }}
              >
                <Box
                  sx={{
                    bgcolor: theme.palette.primary.light,
                    px: 3,
                    py: 2,
                    borderBottom: `1px solid ${theme.palette.primary.main}`,
                  }}
                >
                  <Typography
                    fontWeight={700}
                    color="primary.dark"
                    fontSize={18}
                  >
                    📄 {t("previewWord")}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: { xs: 2, sm: 3 },
                    fontFamily: "'Times New Roman', Times, serif",
                    fontSize: { xs: 14, sm: 16 },
                    lineHeight: 1.8,
                    maxHeight: { xs: 300, sm: 450 },
                    overflowY: "auto",
                    background: "#fafbff",
                  }}
                  dangerouslySetInnerHTML={{ __html: doc.previewHtml }}
                />
              </Card>
            )}
            <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color="primary.main"
                  sx={{ mb: 2 }}
                >
                  📝 {t("contentDetail")}
                </Typography>
                <Box
                  sx={{
                    color: theme.palette.text.primary,
                    whiteSpace: "pre-line",
                    lineHeight: 1.7,
                    fontSize: { xs: 14, sm: 16 },
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.15
                    )}`,
                    backgroundColor: alpha(theme.palette.primary.light, 0.05),
                    maxHeight: { xs: 250, sm: 400 },
                    overflowY: "auto",
                  }}
                >
                  {doc.content || "No detailed content for this document."}
                </Box>
              </CardContent>
            </Card>
            <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color="primary.main"
                  sx={{ mb: 3 }}
                >
                  🔧 {t("action")}
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ flexWrap: "wrap", gap: { xs: 2, sm: 1 } }}
                >
                  {doc.fileUrl && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Download />}
                      onClick={handleDownload}
                      disabled={downloading}
                      sx={{
                        fontWeight: 700,
                        textTransform: "none",
                        borderRadius: 2,
                        px: 3,
                        py: 1.5,
                      }}
                    >
                      {downloading ? t("downloading") : t("downloadWord")}
                    </Button>
                  )}

                  {(account?.role === "ADMIN" ||
                    account?.role === "MANAGER" ||
                    account?.role === "SECRETARY") && (
                    <Button
                      variant="outlined"
                      startIcon={<HistoryIcon />}
                      component={Link}
                      to={`/management/documents/${doc.id}/histories`}
                      sx={{
                        fontWeight: 700,
                        textTransform: "none",
                        borderRadius: 2,
                        px: 3,
                        py: 1.5,
                      }}
                    >
                      {t("viewHistory")}
                    </Button>
                  )}

                  {account?.role === "MANAGER" &&
                    doc.status === "NEW" &&
                    !doc.signature && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Edit />}
                        onClick={handleSign}
                        sx={{
                          fontWeight: 600,
                          textTransform: "none",
                          borderRadius: 2,
                          px: 3,
                          py: 1.5,
                        }}
                      >
                        Signature
                      </Button>
                    )}

                  {!doc.project && account?.id === doc.pmId && (
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={() => setFormOpen(true)}
                      sx={{
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: "none",
                        px: 3,
                        py: 1.5,
                      }}
                    >
                      Create Project
                    </Button>
                  )}
                  {(account?.role === "SECRETARY" ||
                    account?.role === "MANAGER") &&
                    doc.status !== "COMPLETED" &&
                    doc.relatedProjectId &&
                    doc.projectStatus === "COMPLETED" && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleUpdateStatus}
                        sx={{
                          fontWeight: 700,
                          textTransform: "none",
                          borderRadius: 2,
                          px: 3,
                          py: 1.5,
                          ml: "auto",
                        }}
                      >
                        ✅ Update Document Completed
                      </Button>
                    )}
                </Stack>{" "}
                {account?.role === "MANAGER" && doc.status === "NEW" && (
                  <Box
                    sx={{
                      mt: 2,
                      borderRadius: 2,
                      border: `1px dashed ${alpha(
                        theme.palette.warning.main,
                        0.6
                      )}`,
                      p: 2,
                      background: alpha(theme.palette.warning.light, 0.08),
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color="warning.main"
                      sx={{ mb: 1.5 }}
                    >
                      📌 Note for Secretary
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      value={managerNote}
                      onChange={(e) => setManagerNote(e.target.value)}
                      placeholder="Nhập ghi chú yêu cầu chỉnh sửa..."
                    />
                    <Stack
                      direction="row"
                      justifyContent="flex-end"
                      sx={{ mt: 1.5 }}
                    >
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={handleSubmitNote}
                        disabled={noteSaving}
                        sx={{ textTransform: "none", borderRadius: 2 }}
                      >
                        {noteSaving ? "Đang gửi..." : "Gửi yêu cầu chỉnh sửa"}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
            <Divider sx={{ mb: 4 }} />{" "}
            {/* Hiển thị ghi chú mới nhất (chỉ MANAGER & SECRETARY & ADMIN) */}
            {(account?.role === "MANAGER" ||
              account?.role === "ADMIN" ||
              account?.role === "SECRETARY") &&
              doc?.managerNote && (
                <Card elevation={3} sx={{ mb: 4, borderRadius: 3 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color="warning.main"
                      sx={{ mb: 1.5 }}
                    >
                      🗒️ Ghi chú mới nhất từ Giám đốc
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: alpha(theme.palette.warning.light, 0.08),
                        border: `1px solid ${alpha(
                          theme.palette.warning.main,
                          0.3
                        )}`,
                        whiteSpace: "pre-wrap",
                        mb: 2, // thêm margin dưới để cách nút
                      }}
                    >
                      {doc.managerNote}
                    </Box>

                    {(account?.role === "ADMIN" ||
                      account?.role === "SECRETARY") &&
                      doc.status === "NEW" && (
                        <Button
                          variant="contained"
                          color="warning"
                          component={Link}
                          to={`/management/documents/${doc.id}/update`}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Chỉnh sửa theo ghi chú
                        </Button>
                      )}
                  </CardContent>
                </Card>
              )}
            <Card elevation={3} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color="primary.main"
                  sx={{ mb: 3 }}
                >
                  ℹ️ {t("detailInfo")}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <InfoRow
                      icon={<Person />}
                      label={t("createdBy")}
                      value={doc.createdBy}
                      theme={theme}
                      color={theme.palette.success.main}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <InfoRow
                      icon={<Work />}
                      label={t("pm")}
                      value={doc.pmName}
                      theme={theme}
                      color={theme.palette.info.main}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <InfoRow
                      icon={<CalendarToday />}
                      label={t("createdAt")}
                      value={new Date(doc.createdAt).toLocaleString()}
                      theme={theme}
                      color={theme.palette.warning.main}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <InfoRow
                      icon={<InfoOutlined />}
                      label="Status"
                      value={t(doc.status?.toLowerCase())}
                      theme={theme}
                      color={theme.palette.error.main}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Paper>
      </Box>

      {/* Ký điện tử */}
      <Dialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 20,
            textAlign: "center",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: "white",
            mb: 2,
          }}
        >
          ✍️ Ký điện tử công văn
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography fontWeight={600} fontSize={14} mb={2} textAlign="center">
            Chữ ký điện tử của bạn
          </Typography>
          <Box
            sx={{
              border: "2px dashed #1976d2",
              borderRadius: 2,
              width: "100%",
              maxWidth: 400,
              mx: "auto",
              background: "#fff",
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SignatureCanvas
              penColor="#1976d2"
              ref={signaturePadRef}
              canvasProps={{
                width: Math.min(350, window.innerWidth - 100),
                height: 120,
                style: {
                  background: "#f4f7fa",
                  borderRadius: 8,
                  border: "1px solid #eee",
                },
              }}
            />
          </Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Button
              onClick={() =>
                signaturePadRef.current && signaturePadRef.current.clear()
              }
              size="small"
              color="secondary"
            >
              🗑️ Xóa chữ ký
            </Button>
            <Typography
              color="error"
              variant="caption"
              sx={{ fontWeight: 500 }}
            >
              {signError}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setSignDialogOpen(false)}
            color="secondary"
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSign}
            sx={{ minWidth: 100 }}
          >
            ✅ Xác nhận ký
          </Button>
        </DialogActions>
      </Dialog>

      <ProjectFormCreate
        open={formOpen}
        onClose={() => setFormOpen(false)}
        documentId={doc.id}
        document={doc}
        pmName={doc.pmName}
      />
    </>
  );
}

function InfoRow({ icon, label, value, theme, color }) {
  return (
    <Card
      elevation={2}
      sx={{
        height: "100%",
        borderRadius: 2,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 20px ${alpha(color, 0.2)}`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              color: color,
              bgcolor: alpha(color, 0.15),
              p: 1.5,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 48,
              minHeight: 48,
              boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color={color}
              sx={{ mb: 0.5, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
            >
              {label}
            </Typography>
            <Typography
              variant="body2"
              color={theme.palette.text.primary}
              sx={{
                wordBreak: "break-word",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                lineHeight: 1.4,
              }}
            >
              {value || "N/A"}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
