// ~/pages/management/document/DocumentDetail.jsx
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
} from "@mui/material";
import { Grid } from "@mui/material";
import { Person, Work, CalendarToday, InfoOutlined } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchDocumentDetailApi,
  downloadDocumentFileApi,
} from "~/services/document.service";
import ProjectFormCreate from "~/components/project/form/ProjectFormCreate";

export default function DocumentDetail() {
  const { id } = useParams();
  const theme = useTheme();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

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
    <>
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
        <Typography
          variant="h3"
          fontWeight={800}
          color={theme.palette.primary.dark}
          gutterBottom
          sx={{ letterSpacing: 1 }}
        >
          {doc.title}
        </Typography>

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

        {doc.fileUrl && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleDownload}
            disabled={downloading}
            sx={{
              mb: 4,
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

        {/* 👉 Nút Tạo Project */}
        {!doc.project && (
          <Button
            variant="outlined"
            color="success"
            onClick={() => setFormOpen(true)}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              textTransform: "none",
              mb: 4,
            }}
          >
            Create Project
          </Button>
        )}

        <Divider sx={{ mb: 5 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={4}
          flexWrap="wrap"
          justifyContent="space-between"
        >
          <InfoRow
            icon={<Person />}
            label="Created by"
            value={doc.createdBy}
            theme={theme}
            color={theme.palette.success.main}
          />
          <InfoRow
            icon={<Work />}
            label="Project Manager"
            value={doc.receiver}
            theme={theme}
            color={theme.palette.info.main}
          />
          <InfoRow
            icon={<CalendarToday />}
            label="Created at"
            value={new Date(doc.createdAt).toLocaleString()}
            theme={theme}
            color={theme.palette.warning.main}
          />
          <InfoRow
            icon={<InfoOutlined />}
            label="Status"
            value={doc.status}
            theme={theme}
            color={theme.palette.error.main}
          />
        </Stack>
      </Paper>

      {/* 💼 Form tạo project */}
      <ProjectFormCreate
        open={formOpen}
        onClose={() => setFormOpen(false)}
        documentId={doc.id}
        pmName={doc.receiver}
      />
    </>
  );
}

function InfoRow({ icon, label, value, theme, color }) {
  return (
    <Stack
      direction="row"
      spacing={3}
      alignItems="center"
      sx={{ userSelect: "none", mb: 2 }}
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