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
  Grid,
} from "@mui/material";
import {
  Person,
  Work,
  CalendarToday,
  InfoOutlined,
} from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchDocumentDetailApi, downloadDocumentFileApi } from "~/services/document.service";

export default function DocumentDetail() {
  const { id } = useParams();
  const theme = useTheme();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDocumentDetailApi(id).then((res) => {
      if (res.status === 200) setDoc(res.data);
      setLoading(false);
    });
  }, [id]);

  const handleDownload = async () => {
    if (!doc?.fileUrl) return;
    setDownloading(true);
    try {
      const res = await downloadDocumentFileApi(id);
      if (res && res.data) {
        const blob = new Blob([res.data], {
          type:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
        alert("Tải file thất bại");
      }
    } catch {
      alert("Đã có lỗi xảy ra khi tải file");
    }
    setDownloading(false);
  };

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
        Không tìm thấy công văn.
      </Typography>
    );

  return (
    <Paper
      elevation={12}
      sx={{
        maxWidth: 900,
        mx: "auto",
        mt: 6,
        p: 5,
        borderRadius: 4,
        background: `linear-gradient(145deg, ${alpha(
          theme.palette.background.paper,
          0.95
        )}, ${alpha(theme.palette.primary.light, 0.15)})`,
        boxShadow: `0 25px 50px ${alpha(theme.palette.primary.main, 0.25)}`,
      }}
    >
      {/* Tiêu đề */}
      <Typography
        variant="h3"
        fontWeight={800}
        color={theme.palette.primary.dark}
        gutterBottom
        sx={{ letterSpacing: 1 }}
      >
        {doc.title}
      </Typography>

      {/* Nội dung chính */}
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
          boxShadow: `inset 0 0 12px ${alpha(theme.palette.primary.main, 0.07)}`,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {doc.content || "Không có nội dung chi tiết cho công văn này."}
      </Box>

      {/* Nút tải file */}
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
              boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.7)}`,
              transform: "translateY(-3px)",
            },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {downloading ? "Đang tải..." : "Tải file Word"}
        </Button>
      )}

      <Divider sx={{ mb: 5 }} />

      {/* Thông tin chi tiết: chia 2 cột */}
      <Grid container spacing={4}>
        <Grid item xs={12} sm={6}>
          <InfoRow
            icon={<Person />}
            label="Người tạo"
            value={doc.createdBy}
            theme={theme}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <InfoRow
            icon={<Work />}
            label="Quản lý dự án"
            value={doc.projectManager}
            theme={theme}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <InfoRow
            icon={<CalendarToday />}
            label="Ngày tạo"
            value={new Date(doc.createdAt).toLocaleString()}
            theme={theme}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <InfoRow
            icon={<InfoOutlined />}
            label="Trạng thái"
            value={doc.status}
            theme={theme}
            color={theme.palette.error.main}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

function InfoRow({ icon, label, value, theme, color }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ userSelect: "none" }}>
      <Box
        sx={{
          color: color,
          bgcolor: alpha(color, 0.15),
          p: 1.3,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 44,
          minHeight: 44,
          boxShadow: `0 6px 15px ${alpha(color, 0.25)}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} color={color}>
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
