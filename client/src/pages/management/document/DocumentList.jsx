import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Card,
  Chip,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import { Work, Person, CalendarToday } from "@mui/icons-material";
import { useEffect, useState } from "react";
import {
  fetchDocumentsApi,
  fetchMyDocumentsApi,
} from "~/services/document.service";
import DocumentCreate from "./DocumentCreate";
import { useSelector } from "react-redux";

export default function DocumentList() {
  const theme = useTheme();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const account = useSelector((state) => state.account.value);
  const accessToken = localStorage.getItem("accessToken");

  const fetchList = async () => {
    setLoading(true);
    let res;
    if (account.role === "ADMIN" || account.role === "MANAGER") {
      res = await fetchDocumentsApi(accessToken);
    } else if (account.role === "PM" || account.role === "ACCOUNTANT") {
      res = await fetchMyDocumentsApi(accessToken);
    } else {
      res = { status: 403, data: [] };
    }
    if (res.status === 200) setDocuments(res.data);
    else setDocuments([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, [account.role]);

  const statusColor = (status) => {
    switch (status) {
      case "Hoàn thành":
        return "success";
      case "Đang xử lý":
        return "warning";
      case "Chờ duyệt":
        return "info";
      default:
        return "default";
    }
  };

  const iconColors = {
    createdBy: theme.palette.success.main,
    receiver: theme.palette.info.main,
    createdAt: theme.palette.warning.main,
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 5,
          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          pb: 1,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            color: theme.palette.primary.main,
          }}
        >
          Danh sách công văn
        </Typography>
        {(account.role === "ADMIN" || account.role === "MANAGER") && (
          <Button
            variant="contained"
            onClick={() => setShowCreate(true)}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              textTransform: "none",
              "&:hover": {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                boxShadow: `0 12px 24px ${alpha(
                  theme.palette.primary.main,
                  0.6
                )}`,
                transform: "translateY(-2px)",
              },
              transition: "all 0.3s ease-in-out",
            }}
          >
            Tạo công văn mới
          </Button>
        )}
      </Box>

      {/* Modal tạo công văn */}
      {showCreate && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.3)",
            zIndex: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 2,
          }}
        >
          <DocumentCreate
            onSuccess={() => {
              setShowCreate(false);
              fetchList();
            }}
            onCancel={() => setShowCreate(false)}
          />
        </Box>
      )}

      {/* Nội dung chính */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
          <CircularProgress size={40} />
        </Box>
      ) : documents.length === 0 ? (
        <Typography
          align="center"
          color="text.secondary"
          sx={{ mt: 10, fontSize: 22, fontWeight: 600 }}
        >
          Không có công văn nào.
        </Typography>
      ) : (
        <Stack spacing={5}>
          {documents.map((doc) => (
            <Card
              key={doc.id}
              sx={{
                borderRadius: 3,
                boxShadow: `0 20px 40px ${alpha(
                  theme.palette.primary.main,
                  0.2
                )}`,
                background: `linear-gradient(145deg, ${alpha(
                  theme.palette.background.paper,
                  0.98
                )}, ${alpha(theme.palette.primary.light, 0.1)})`,
                transition: "all 0.3s ease-in-out",
                "&:hover": {
                  boxShadow: `0 30px 60px ${alpha(
                    theme.palette.primary.main,
                    0.35
                  )}`,
                  transform: "translateY(-10px)",
                  background: `linear-gradient(145deg, ${alpha(
                    theme.palette.background.paper,
                    1
                  )}, ${alpha(theme.palette.primary.main, 0.15)})`,
                },
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 4,
                p: 4,
                minHeight: 160,
              }}
            >
              {/* Left side: title + status */}
              <Box
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(
                    theme.palette.primary.main,
                    0.25
                  )}`,
                  backgroundColor: alpha(theme.palette.primary.light, 0.12),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  p: 3,
                  minWidth: 280,
                  position: "relative",
                  boxShadow: `0 6px 16px ${alpha(
                    theme.palette.primary.main,
                    0.12
                  )}`,
                }}
              >
                {/* Title */}
                <Typography
                  variant="h6"
                  fontWeight={700}
                  gutterBottom
                  sx={{ lineHeight: 1.3, color: theme.palette.primary.dark }}
                  noWrap
                >
                  {doc.title}
                </Typography>

                {/* Mô tả ngắn */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5, lineHeight: 1.4, userSelect: "none" }}
                >
                  {doc.description || "Mô tả vắn tắt công văn..."}
                </Typography>

                {/* Status chip */}
                <Chip
                  label={doc.status}
                  color={statusColor(doc.status)}
                  variant="filled"
                  sx={{
                    fontWeight: 600,
                    alignSelf: "flex-start",
                    px: 2,
                    py: 0.6,
                    fontSize: 14,
                    boxShadow: `0 3px 10px ${alpha(
                      theme.palette.primary.main,
                      0.25
                    )}`,
                    borderRadius: 3,
                  }}
                />

                {/* Background decor */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: alpha(theme.palette.primary.main, 0.07),
                    filter: "blur(12px)",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />
              </Box>

              {/* Right side: info boxes */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                flex={2}
                gap={3}
                justifyContent="space-between"
                flexWrap="wrap"
              >
                {/* Người tạo */}
                <Box
                  sx={{
                    flexBasis: "30%",
                    borderRadius: 2,
                    border: `1px solid ${alpha(iconColors.createdBy, 0.4)}`,
                    backgroundColor: alpha(iconColors.createdBy, 0.15),
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 3,
                    boxShadow: `0 8px 20px ${alpha(
                      iconColors.createdBy,
                      0.15
                    )}`,
                  }}
                >
                  <Person sx={{ color: iconColors.createdBy, fontSize: 34 }} />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: iconColors.createdBy,
                        mb: 0.5,
                      }}
                    >
                      Người tạo
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color="text.primary"
                      noWrap
                    >
                      {doc.createdBy}
                    </Typography>
                  </Box>
                </Box>

                {/* Người nhận (receiver) */}
                <Box
                  sx={{
                    flexBasis: "30%",
                    borderRadius: 2,
                    border: `1px solid ${alpha(
                      iconColors.receiver,
                      0.4
                    )}`,
                    backgroundColor: alpha(iconColors.receiver, 0.15),
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 3,
                    boxShadow: `0 8px 20px ${alpha(
                      iconColors.receiver,
                      0.15
                    )}`,
                  }}
                >
                  <Work
                    sx={{ color: iconColors.receiver, fontSize: 34 }}
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: iconColors.receiver,
                        mb: 0.5,
                      }}
                    >
                      Người nhận
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color="text.primary"
                      noWrap
                    >
                      {doc.receiver}
                    </Typography>
                  </Box>
                </Box>

                {/* Ngày tạo */}
                <Box
                  sx={{
                    flexBasis: "30%",
                    borderRadius: 2,
                    border: `1px solid ${alpha(iconColors.createdAt, 0.4)}`,
                    backgroundColor: alpha(iconColors.createdAt, 0.15),
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 3,
                    boxShadow: `0 8px 20px ${alpha(
                      iconColors.createdAt,
                      0.15
                    )}`,
                  }}
                >
                  <CalendarToday
                    sx={{ color: iconColors.createdAt, fontSize: 34 }}
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: iconColors.createdAt,
                        mb: 0.5,
                      }}
                    >
                      Ngày tạo
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color="text.primary"
                      noWrap
                    >
                      {new Date(doc.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
