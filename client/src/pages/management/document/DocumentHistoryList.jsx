import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  TextField,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Pagination,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { Search, Clear, South, North, Refresh, History } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { fetchDocumentHistoriesPageApi } from "~/services/document.service";

const formatDate = (d) => (d ? new Date(d).toLocaleString() : "-");

export default function DocumentHistoryList() {
  const theme = useTheme();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [keyword, setKeyword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const payload = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      sortBy: sortDir,
      searchTerm,
    }),
    [page, pageSize, sortDir, searchTerm]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchDocumentHistoriesPageApi(id, payload);
      const data = res?.data ?? res;
      const list = data?.histories ?? [];
      setRows(list);
      setTotalPages(data?.totalPage ?? 1);
      setTotalElements(data?.totalElements ?? list.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, payload]);

  const handleSearch = () => {
    setPage(1);
    setSearchTerm(keyword.trim());
  };

  const clearSearch = () => {
    setKeyword("");
    setPage(1);
    setSearchTerm("");
  };

  // 🔹 helper đổi màu action
  const actionColor = (a) => {
    switch ((a || "").toUpperCase()) {
      case "CREATED":
        return "success";
      case "APPROVED":
        return "info";
      case "REJECTED":
        return "error";
      default:
        return "default";
    }
  };

  const statusColor = (s) => {
    switch ((s || "").toUpperCase()) {
      case "APPROVED":
        return "success";
      case "REJECTED":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <History sx={{ color: "white", fontSize: 36 }} />
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "white", mb: 0.5 }}
            >
              Document Histories
            </Typography>
            <Typography sx={{ color: alpha("#fff", 0.85), fontWeight: 500 }}>
              Track all changes, approvals and rejections of this document
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Filter bar */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: alpha(theme.palette.background.paper, 0.8),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="center"
        >
          <TextField
            fullWidth
            size="small"
            label="Search"
            placeholder="Search note/title/actor…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {keyword && (
                    <Tooltip title="Clear">
                      <IconButton onClick={clearSearch}>
                        <Clear />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Search">
                    <IconButton onClick={handleSearch}>
                      <Search />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="sort-label">Sort by Version</InputLabel>
            <Select
              labelId="sort-label"
              value={sortDir}
              label="Sort by Version"
              onChange={(e) => {
                setSortDir(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="desc">
                <South fontSize="small" sx={{ mr: 1 }} /> Descending
              </MenuItem>
              <MenuItem value="asc">
                <North fontSize="small" sx={{ mr: 1 }} /> Ascending
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="rows-label">Rows per page</InputLabel>
            <Select
              labelId="rows-label"
              value={pageSize}
              label="Rows per page"
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <MenuItem key={n} value={n}>
                  {n} / page
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box flex={1} />

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        }}
      >
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow
                sx={{
                  background: alpha(theme.palette.primary.main, 0.08),
                }}
              >
                {[
                  "Version",
                  "Time",
                  "Action",
                  "Created By",
                  "Title",
                  "Type",
                  "Status",
                  "Manager Note",
                ].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography>No history found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((h) => (
                  <TableRow
                    key={h.id ?? `${h.version}-${h.createdAt}`}
                    hover
                    sx={{
                      "&:hover": {
                        background: alpha(
                          theme.palette.primary.main,
                          0.04
                        ),
                      },
                    }}
                  >
                    <TableCell>
                      <Chip size="small" label={h.version ?? "-"} />
                    </TableCell>
                    <TableCell>{formatDate(h.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.action ?? "-"}
                        color={actionColor(h.action)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {h.createdByName ??
                        h.createdBy?.fullName ??
                        h.createdBy?.username ??
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Typography noWrap title={h.title || ""}>
                        {h.title || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={h.type ?? "-"} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.status ?? "-"}
                        color={statusColor(h.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography noWrap title={h.managerNote || ""}>
                        {h.managerNote || ""}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderTop: `1px solid ${alpha(theme.palette.grey[300], 0.4)}`,
            background: alpha(theme.palette.background.paper, 0.7),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total: <b>{totalElements}</b>
          </Typography>

          <Pagination
            color="primary"
            page={page}
            count={totalPages || 1}
            onChange={(_, p) => setPage(p)}
            showFirstButton
            showLastButton
          />
        </Box>
      </Paper>
    </Box>
  );
}
