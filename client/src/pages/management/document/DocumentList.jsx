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
  Pagination,
  TextField,
  MenuItem,
  InputAdornment,
  TableSortLabel,
  Container,
  Grid,
  Paper,
  Fade,
  Zoom,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Work,
  Person,
  CalendarToday,
  Search,
  Add,
  FilterList,
  Sort,
  Description,
  Visibility,
} from "@mui/icons-material";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchDocumentsPageApi,
  fetchMyDocumentsPageApi,
} from "~/services/document.service";
import DocumentCreate from "./DocumentCreate";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const statusColor = (status) => {
  switch (status) {
    case "COMPLETED":
    case "Hoàn thành":
      return "success";
    case "PROCESSING":
    case "IN_PROGRESS":
    case "Đang xử lý":
      return "warning";
    case "NEW":
    case "Chờ duyệt":
      return "info";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
};

// Enhanced Status Chip Component
const StatusChip = ({ status, theme }) => {
  const color = statusColor(status);
  const colorMap = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    error: theme.palette.error.main,
    default: theme.palette.grey[500],
  };

  return (
    <Chip
      label={status}
      sx={{
        fontWeight: 700,
        fontSize: "0.75rem",
        height: 32,
        px: 2,
        background: `linear-gradient(135deg, ${alpha(
          colorMap[color],
          0.15
        )} 0%, ${alpha(colorMap[color], 0.05)} 100%)`,
        border: `1px solid ${alpha(colorMap[color], 0.3)}`,
        color: colorMap[color],
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        boxShadow: `0 2px 8px ${alpha(colorMap[color], 0.2)}`,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: `0 4px 12px ${alpha(colorMap[color], 0.3)}`,
          background: `linear-gradient(135deg, ${alpha(
            colorMap[color],
            0.2
          )} 0%, ${alpha(colorMap[color], 0.1)} 100%)`,
        },
      }}
    />
  );
};

// Enhanced Info Box Component
const InfoBox = ({ icon: Icon, title, value, color, theme }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(
          color,
          0.03
        )} 100%)`,
        border: `1px solid ${alpha(color, 0.15)}`,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 12px 24px ${alpha(color, 0.15)}`,
          background: `linear-gradient(135deg, ${alpha(
            color,
            0.12
          )} 0%, ${alpha(color, 0.06)} 100%)`,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(
            color,
            0.7
          )} 100%)`,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(
            color,
            0.1
          )} 0%, transparent 70%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(
              color,
              0.15
            )} 0%, ${alpha(color, 0.1)} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
          }}
        >
          <Icon sx={{ color, fontSize: 24 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: alpha(color, 0.8),
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontSize: "0.7rem",
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              fontSize: "0.9rem",
              lineHeight: 1.2,
              mt: 0.5,
            }}
            noWrap
          >
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default function DocumentList() {
  const theme = useTheme();
  const account = useSelector((state) => state.account.value);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("desc");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(6);
  const [totalPage, setTotalPage] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation("document_page");
  const handleCardClick = (id) => {
    navigate(`/management/documents/${id}`);
  };

  const STATUS_OPTIONS = [
    { value: "", label: t("allStatus"), color: "default" },
    { value: "NEW", label: t("new"), color: "info" },
    { value: "IN_PROGRESS", label: t("inProgress"), color: "warning" },
    { value: "COMPLETED", label: t("completed"), color: "success" },
    { value: "REJECTED", label: t("rejected"), color: "error" },
  ];

  const TYPE_OPTIONS = [
    { value: "", label: t("allType") },
    { value: "PROJECT", label: t("project") },
    { value: "ADMINISTRATIVE", label: t("administrative") },
  ];

  const statusKeyMap = {
    NEW: "new",
    IN_PROGRESS: "inProgress",
    COMPLETED: "completed",
    REJECTED: "rejected",
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    let res;
    const payload = {
      pageNumber: page,
      pageSize: rowsPerPage,
      searchTerm,
      sortBy,
      statusFilter,
      typeFilter,
    };

    if (
      account.role === "ADMIN" ||
      account.role === "MANAGER" ||
      account.role === "SECRETARY"
    ) {
      res = await fetchDocumentsPageApi(payload);
    } else if (["PM", "ACCOUNTANT"].includes(account.role)) {
      res = await fetchMyDocumentsPageApi(payload);
    } else {
      res = { status: 403, data: { documents: [], totalPage: 0 } };
    }

    if (res.status === 200) {
      setDocuments(res.data.documents);
      setTotalPage(res.data.totalPage || 1);
    } else {
      setDocuments([]);
      setTotalPage(1);
    }
    setLoading(false);
  }, [
    account.role,
    page,
    rowsPerPage,
    searchTerm,
    sortBy,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchList(), 350);
    return () => clearTimeout(timer);
  }, [fetchList, page, searchTerm, sortBy]);

  const iconColors = {
    createdBy: theme.palette.success.main,
    receiver: theme.palette.info.main,
    createdAt: theme.palette.warning.main,
  };

  return (
    <>
      {/* Add custom CSS animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Enhanced Header */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            borderRadius: 4,
            p: 4,
            mb: 4,
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.light,
                0.1
              )} 0%, transparent 50%, ${alpha(
                theme.palette.primary.dark,
                0.1
              )} 100%)`,
              animation: "shimmer 3s ease-in-out infinite",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${alpha(
                theme.palette.common.white,
                0.1
              )} 0%, transparent 70%)`,
              animation: "float 6s ease-in-out infinite",
            },
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={3}
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: "white",
                  mb: 1,
                  textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                📋 {t("title")}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: alpha(theme.palette.common.white, 0.9),
                  fontWeight: 500,
                }}
              >
                {t("subtitle")}
              </Typography>
            </Box>

            {(account.role === "ADMIN" || account.role === "MANAGER") && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowCreate(true)}
                sx={{
                  background: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: "none",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.25)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                  },
                }}
              >
                {t("createNew")}
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Enhanced Search and Filter Section */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: "blur(20px)",
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Stack spacing={3}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: 2,
              }}
            >
              <FilterList sx={{ color: theme.palette.primary.main }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                }}
              >
                {t("search&Filter")}
              </Typography>
            </Box>

            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search
                          sx={{
                            color: theme.palette.primary.main,
                          }}
                        />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      background: alpha(theme.palette.primary.main, 0.04),
                      "&:hover": {
                        background: alpha(theme.palette.primary.main, 0.08),
                      },
                      "&.Mui-focused": {
                        background: alpha(theme.palette.primary.main, 0.08),
                      },
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={t("status")}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {opt.value && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor:
                                iconColors[opt.color] ||
                                theme.palette.grey[400],
                            }}
                          />
                        )}
                        <Typography>{opt.label}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={t("type")}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: alpha(theme.palette.primary.main, 0.04),
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.1
                    )}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Sort
                      sx={{
                        color: theme.palette.primary.main,
                        fontSize: 20,
                      }}
                    />
                    <TableSortLabel
                      active
                      direction={sortBy}
                      onClick={() =>
                        setSortBy((prev) => (prev === "asc" ? "desc" : "asc"))
                      }
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.primary.main,
                        "& .MuiTableSortLabel-icon": {
                          color: `${theme.palette.primary.main} !important`,
                        },
                      }}
                    >
                      {t("sortByDate")} (
                      {sortBy === "asc" ? t("oldestFirst") : t("latestFirst")})
                    </TableSortLabel>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        {/* Create Document Modal */}
        {showCreate && (
          <Fade in={showCreate}>
            <Box
              sx={{
                position: "fixed",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                zIndex: 1300,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
              }}
            >
              <Zoom in={showCreate}>
                <Box>
                  <DocumentCreate
                    onSuccess={() => {
                      setShowCreate(false);
                      fetchList();
                    }}
                    onCancel={() => setShowCreate(false)}
                  />
                </Box>
              </Zoom>
            </Box>
          </Fade>
        )}

        {/* Content */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 10,
            }}
          >
            <Stack alignItems="center" spacing={3}>
              <CircularProgress size={48} thickness={4} />
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                {t("loading")}
              </Typography>
            </Stack>
          </Box>
        ) : documents.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: "center",
              borderRadius: 4,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.grey[50],
                0.8
              )} 0%, ${alpha(theme.palette.grey[100], 0.4)} 100%)`,
              border: `2px dashed ${alpha(theme.palette.grey[300], 0.8)}`,
            }}
          >
            <Description
              sx={{
                fontSize: 80,
                color: theme.palette.grey[400],
                mb: 2,
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: theme.palette.grey[600],
                mb: 1,
              }}
            >
              {t("noDocumentsTitle")}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t("noDocumentsSubtitle")}
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {documents.map((doc, index) => (
              <Fade in key={doc.id} timeout={300 + index * 100}>
                <Card
                  onClick={() => handleCardClick(doc.id)}
                  sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: `linear-gradient(145deg, ${
                      theme.palette.background.paper
                    } 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    border: `1px solid ${alpha(
                      theme.palette.primary.main,
                      0.08
                    )}`,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: `0 20px 40px ${alpha(
                        theme.palette.primary.main,
                        0.15
                      )}`,
                      background: `linear-gradient(145deg, ${
                        theme.palette.background.paper
                      } 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                      "& .document-overlay": {
                        opacity: 1,
                      },
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    },
                  }}
                >
                  {/* Hover overlay */}
                  <Box
                    className="document-overlay"
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      opacity: 0,
                      transition: "opacity 0.3s ease",
                      zIndex: 2,
                    }}
                  >
                    <Tooltip title={t("viewDetails")}>
                      <IconButton
                        sx={{
                          background: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          "&:hover": {
                            background: alpha(theme.palette.primary.main, 0.2),
                          },
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ p: 4 }}>
                    <Grid container spacing={4}>
                      {/* Left Section - Title and Description */}
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 3,
                            height: "100%",
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha(
                              theme.palette.primary.main,
                              0.06
                            )} 0%, ${alpha(
                              theme.palette.primary.main,
                              0.02
                            )} 100%)`,
                            border: `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.1
                            )}`,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: theme.palette.primary.dark,
                              mb: 2,
                              lineHeight: 1.3,
                            }}
                          >
                            {doc.title}
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              color: theme.palette.text.secondary,
                              mb: 3,
                              lineHeight: 1.6,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {doc.description ||
                              "Brief description of the document content and purpose..."}
                          </Typography>

                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <StatusChip
                              status={t(statusKeyMap[doc.status] || doc.status)}
                              theme={theme}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.text.secondary,
                                fontWeight: 500,
                                background: alpha(theme.palette.grey[500], 0.1),
                                px: 2,
                                py: 0.5,
                                borderRadius: 2,
                              }}
                            >
                              {t("id")}: {doc.id}
                            </Typography>
                          </Box>

                          {/* Decorative element */}
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: -20,
                              right: -20,
                              width: 80,
                              height: 80,
                              borderRadius: "50%",
                              background: `radial-gradient(circle, ${alpha(
                                theme.palette.primary.main,
                                0.1
                              )} 0%, transparent 70%)`,
                              pointerEvents: "none",
                            }}
                          />
                        </Paper>
                      </Grid>

                      {/* Right Section - Info Boxes */}
                      <Grid size={{ xs: 12, md: 7 }}>
                        <Stack spacing={2} sx={{ height: "100%" }}>
                          <InfoBox
                            icon={Person}
                            title={t("creator")}
                            value={doc.createdBy}
                            color={iconColors.createdBy}
                            theme={theme}
                          />
                          <InfoBox
                            icon={Work}
                            title={t("receiver")}
                            value={doc.receiver}
                            color={iconColors.receiver}
                            theme={theme}
                          />
                          <InfoBox
                            icon={CalendarToday}
                            title={t("createdDate")}
                            value={new Date(doc.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                            color={iconColors.createdAt}
                            theme={theme}
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              </Fade>
            ))}
          </Stack>
        )}

        {/* Enhanced Pagination */}
        {totalPage > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 6,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: "blur(20px)",
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <Pagination
                count={totalPage}
                page={page}
                onChange={(e, v) => setPage(v)}
                color="primary"
                size="large"
                sx={{
                  "& .MuiPaginationItem-root": {
                    fontWeight: 600,
                    "&.Mui-selected": {
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      color: "white",
                      boxShadow: `0 4px 12px ${alpha(
                        theme.palette.primary.main,
                        0.3
                      )}`,
                    },
                  },
                }}
              />
            </Paper>
          </Box>
        )}
      </Container>
    </>
  );
}
