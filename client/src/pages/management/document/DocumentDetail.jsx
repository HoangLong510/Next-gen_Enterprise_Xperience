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
} from "@mui/material";
import { Person, Work, CalendarToday, InfoOutlined } from "@mui/icons-material";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  fetchDocumentDetailApi,
  downloadDocumentFileApi,
  signDocumentApi, // <--- Thêm api ký
} from "~/services/document.service";
import SignatureCanvas from "react-signature-canvas"; // cần cài gói này nếu ký hình

export default function DocumentDetail() {
  const { id } = useParams();
  const theme = useTheme();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signError, setSignError] = useState("");
  const signaturePadRef = useRef(null);

  const account = useSelector((state) => state.account.value);

  // Fetch document detail
  const fetchDetail = async () => {
    setLoading(true);
    const res = await fetchDocumentDetailApi(id);
    if (res.status === 200) setDoc(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line
  }, [id]);

  // Download word file
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

  // Xử lý ký điện tử
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
      fetchDetail(); // reload lại doc detail
    } else {
      alert(res.message || "Ký công văn thất bại!");
    }
  };

  // Loading
  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress size={40} />
      </Box>
    );

  if (!doc)
    return (
      <Typography
        color="text.secondary"
        sx={{ mt: 10, fontSize: 22, fontWeight: 600, textAlign: "center" }}
      >
        Document not found.
      </Typography>
    );

  return (
    <Paper
      elevation={12}
      sx={{
        maxWidth: 1200,
        width: "90%",
        mx: "auto",
        mt: 6,
        p: 3,
        borderRadius: 4,
        background: `linear-gradient(145deg, ${alpha(
          theme.palette.background.paper,
          0.95
        )}, ${alpha(theme.palette.primary.light, 0.15)})`,
        boxShadow: `0 25px 50px ${alpha(theme.palette.primary.main, 0.25)}`,
      }}
    >
      {/* Title */}
      <Typography
        variant="h3"
        fontWeight={800}
        color={theme.palette.primary.dark}
        gutterBottom
        sx={{ letterSpacing: 1 }}
      >
        {doc.title}
      </Typography>

      {/* Xem trước file Word nếu có */}
      {doc.previewHtml && (
        <Box
          sx={{
            mb: 4,
            borderRadius: 3,
            background: "#fff",
            border: `2px solid ${theme.palette.primary.light}`,
            p: 0,
            overflow: "hidden",
            boxShadow: `0 2px 12px ${alpha(theme.palette.primary.light, 0.2)}`,
          }}
        >
          <Box
            sx={{
              bgcolor: theme.palette.primary.light,
              px: 3,
              py: 1.5,
              borderBottom: `1px solid ${theme.palette.primary.main}`,
            }}
          >
            <Typography fontWeight={700} color="primary.dark" fontSize={18}>
              Xem trước công văn (bản Word)
            </Typography>
          </Box>
          <Box
            sx={{
              p: 3,
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: 16,
              lineHeight: 1.8,
              maxHeight: 450,
              overflowY: "auto",
              background: "#fafbff",
            }}
            dangerouslySetInnerHTML={{ __html: doc.previewHtml }}
          />
        </Box>
      )}

      {/* Main content */}
      <Box
        sx={{
          mb: 3,
          color: theme.palette.text.primary,
          whiteSpace: "pre-line",
          lineHeight: 1.7,
          fontSize: 16,
          p: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          backgroundColor: alpha(theme.palette.primary.light, 0.1),
          boxShadow: `inset 0 0 12px ${alpha(
            theme.palette.primary.main,
            0.07
          )}`,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {doc.content || "No detailed content for this document."}
      </Box>

      {/* Download button */}
      {doc.fileUrl && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleDownload}
          disabled={downloading}
          sx={{
            mb: 5,
            fontWeight: 700,
            textTransform: "none",
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.5)}`,
            "&:hover": {
              boxShadow: `0 12px 24px ${alpha(
                theme.palette.primary.main,
                0.7
              )}`,
              transform: "translateY(-3px)",
            },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {downloading ? "Downloading..." : "Download Word file"}
        </Button>
      )}

      {/* Nút ký điện tử - chỉ hiện cho giám đốc, trạng thái NEW, chưa ký */}
      {account?.role === "MANAGER" &&
        doc.status === "NEW" &&
        !doc.signature && (
          <Button
            variant="contained"
            color="success"
            sx={{ mb: 2, fontWeight: 600 }}
            onClick={handleSign}
          >
            Ký điện tử công văn
          </Button>
        )}

      {/* Dialog ký điện tử */}
      <Dialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700} fontSize={20}>
          Ký điện tử công văn
        </DialogTitle>
        <DialogContent>
          <Typography fontWeight={600} fontSize={14} mb={1}>
            Chữ ký điện tử của bạn
          </Typography>
          <Box
            sx={{
              border: "2px dashed #1976d2",
              borderRadius: 2,
              width: 360,
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
                width: 320,
                height: 100,
                style: {
                  background: "#f4f7fa",
                  borderRadius: 8,
                  border: "1px solid #eee",
                },
              }}
            />
          </Box>
          <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between" }}>
            <Button
              onClick={() =>
                signaturePadRef.current && signaturePadRef.current.clear()
              }
            >
              Xóa chữ ký
            </Button>
            <Typography color="error" variant="caption">
              {signError}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignDialogOpen(false)} color="secondary">
            Hủy
          </Button>
          <Button variant="contained" onClick={handleSaveSign}>
            Xác nhận ký
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ mb: 5 }} />

      {/* Info section: 2 columns */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={4}
        flexWrap="wrap"
        justifyContent="space-between"
      >
        <Box sx={{ flex: "1 1 22%", minWidth: 150, maxWidth: 220 }}>
          <InfoRow
            icon={<Person />}
            label="Created by"
            value={doc.createdBy}
            theme={theme}
            color={theme.palette.success.main}
          />
        </Box>

        <Box sx={{ flex: "1 1 22%", minWidth: 150, maxWidth: 220 }}>
          <InfoRow
            icon={<Work />}
            label="Project Manager"
            value={doc.receiver}
            theme={theme}
            color={theme.palette.info.main}
          />
        </Box>

        <Box sx={{ flex: "1 1 22%", minWidth: 150, maxWidth: 220 }}>
          <InfoRow
            icon={<CalendarToday />}
            label="Created at"
            value={new Date(doc.createdAt).toLocaleString()}
            theme={theme}
            color={theme.palette.warning.main}
          />
        </Box>

        <Box sx={{ flex: "1 1 22%", minWidth: 150, maxWidth: 220 }}>
          <InfoRow
            icon={<InfoOutlined />}
            label="Status"
            value={doc.status}
            theme={theme}
            color={theme.palette.error.main}
          />
        </Box>
      </Stack>
    </Paper>
  );
}

function InfoRow({ icon, label, value, theme, color }) {
  return (
    <Stack
      direction="row"
      spacing={3}
      alignItems="center"
      sx={{ userSelect: "none" }}
    >
      <Box
        sx={{
          color: color,
          bgcolor: alpha(color, 0.15),
          p: 1.5,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 50,
          minHeight: 50,
          boxShadow: `0 8px 20px ${alpha(color, 0.3)}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          color={color}
          sx={{ mb: 0.5 }}
        >
          {label}
        </Typography>
        <Typography
          variant="body1"
          color={theme.palette.text.primary}
          sx={{ maxWidth: 550, wordBreak: "break-word" }}
        >
          {value || "N/A"}
        </Typography>
      </Box>
    </Stack>
  );
}
