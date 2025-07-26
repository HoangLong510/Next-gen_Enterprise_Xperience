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
} from "@mui/material";
import { Work, Person, CalendarToday, Search } from "@mui/icons-material";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchDocumentsPageApi,
  fetchMyDocumentsPageApi,
} from "~/services/document.service";
import DocumentCreate from "./DocumentCreate";
import { useSelector } from "react-redux";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "NEW", label: "NEW" },
  { value: "IN_PROGRESS", label: "IN_PROGRESS" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "REJECTED", label: "REJECTED" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Type" },
  { value: "PROJECT", label: "PROJECT" },
  { value: "ADMINISTRATIVE", label: "ADMINISTRATIVE" },
  { value: "OTHER", label: "Khác" },
];

// Hàm chuyển status sang màu
const statusColor = (status) => {
  switch (status) {
    case "COMPLETED":
    case "Hoàn thành":
      return "success";
    case "PROCESSING":
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

export default function DocumentList() {
  const theme = useTheme();
  const account = useSelector((state) => state.account.value);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // State filter, sort, page
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("desc");
  const [page, setPage] = useState(1); // phân trang base 1
  const [rowsPerPage] = useState(6);
  const [totalPage, setTotalPage] = useState(0);

  const navigate = useNavigate();
  const handleCardClick = (id) => {
    navigate(`/management/documents/${id}`);
  };

  // Lấy danh sách
  const fetchList = useCallback(async () => {
    setLoading(true);
    let res;
    const payload = {
      pageNumber: page,
      pageSize: rowsPerPage,
      searchTerm,
      sortBy,
      statusFilter, // <-- thêm
      typeFilter, // <-- thêm
    };
    if (account.role === "ADMIN" || account.role === "MANAGER") {
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

  // Debounce searchTerm
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
    <Box sx={{ maxWidth: 1400, mx: "auto", p: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 5,
          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          pb: 1,
          flexWrap: "wrap",
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
          Dispatch List
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
            Create new dispatch
          </Button>
        )}
      </Box>

      {/* Thanh search & sort */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        mb={4}
        flexWrap="wrap"
      >
        <TextField
          size="small"
          placeholder="Search title/content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20 }} />
              </InputAdornment>
            ),
            sx: { borderRadius: 2 },
          }}
          sx={{ width: { xs: "100%", sm: 250 } }}
        />

        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ minWidth: 170 }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TableSortLabel
          active
          direction={sortBy}
          onClick={() => setSortBy((prev) => (prev === "asc" ? "desc" : "asc"))}
          sx={{ fontWeight: 600, ml: { xs: 0, sm: 2 } }}
        >
          Sort by creation date ({sortBy === "asc" ? "Oldest" : "Latest"})
        </TableSortLabel>
      </Stack>

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
              onClick={() => handleCardClick(doc.id)}
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
                <Typography
                  variant="h6"
                  fontWeight={700}
                  gutterBottom
                  sx={{ lineHeight: 1.3, color: theme.palette.primary.dark }}
                  noWrap
                >
                  {doc.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5, lineHeight: 1.4, userSelect: "none" }}
                >
                  {doc.description || "Brief description of the document..."}
                </Typography>
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
                      Creator
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
                <Box
                  sx={{
                    flexBasis: "30%",
                    borderRadius: 2,
                    border: `1px solid ${alpha(iconColors.receiver, 0.4)}`,
                    backgroundColor: alpha(iconColors.receiver, 0.15),
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 3,
                    boxShadow: `0 8px 20px ${alpha(iconColors.receiver, 0.15)}`,
                  }}
                >
                  <Work sx={{ color: iconColors.receiver, fontSize: 34 }} />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: iconColors.receiver,
                        mb: 0.5,
                      }}
                    >
                      Receiver
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
                      Creation Date
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

      {/* Pagination */}
      <Box mt={5} display="flex" justifyContent="flex-end">
        <Pagination
          color="primary"
          count={totalPage}
          page={page}
          onChange={(e, v) => setPage(v)}
        />
      </Box>
    </Box>
  );
}
