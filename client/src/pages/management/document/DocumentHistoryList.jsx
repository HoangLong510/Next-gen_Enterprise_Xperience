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
} from "@mui/material";
import { Search, Clear, South, North, Refresh } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { fetchDocumentHistoriesPageApi } from "~/services/document.service";

const formatDate = (d) => (d ? new Date(d).toLocaleString() : "-");

export default function DocumentHistoryList() {
  const { id } = useParams(); // documentId
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  // server-side paging/sort/filter
  const [page, setPage] = useState(1); // BE nhận 1-based
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [keyword, setKeyword] = useState("");     // ô nhập
  const [searchTerm, setSearchTerm] = useState(""); // apply khi bấm search
  const [sortDir, setSortDir] = useState("desc"); // asc | desc (BE dùng làm direction)

  const payload = useMemo(
    () => ({
      pageNumber: page,
      pageSize,
      sortBy: sortDir,     // BE sort theo "version" với direction này
      searchTerm,          // nếu BE chưa hỗ trợ sẽ bị ignore
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

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Document Histories
      </Typography>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            fullWidth
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
                      <IconButton onClick={clearSearch}><Clear /></IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Search">
                    <IconButton onClick={handleSearch}><Search /></IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel id="sort-label">Sort by Version</InputLabel>
            <Select
              labelId="sort-label"
              label="Sort by Version"
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="desc">
                <South fontSize="small" sx={{ mr: 1 }} />
                Descending
              </MenuItem>
              <MenuItem value="asc">
                <North fontSize="small" sx={{ mr: 1 }} />
                Ascending
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="rows-label">Rows</InputLabel>
            <Select
              labelId="rows-label"
              label="Rows"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <MenuItem key={n} value={n}>{n}/page</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Refresh">
            <span>
              <Button variant="outlined" onClick={loadData} startIcon={<Refresh />}>
                Refresh
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper sx={{ p: 0, overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width={90}>Version</TableCell>
                <TableCell width={180}>Time</TableCell>
                <TableCell width={140}>Action</TableCell>
                <TableCell width={220}>Created By</TableCell>
                <TableCell width={240}>Title</TableCell>
                <TableCell width={140}>Type</TableCell>
                <TableCell width={140}>Status</TableCell>
                <TableCell>Manager Note</TableCell>
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
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((h) => (
                  <TableRow key={h.id ?? `${h.version}-${h.createdAt}`}>
                    <TableCell>
                      <Chip size="small" label={h.version ?? "-"} />
                    </TableCell>
                    <TableCell>{formatDate(h.createdAt)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.action ?? "-"}
                        color={
                          (h.action || "").toUpperCase() === "CREATED"
                            ? "success"
                            : (h.action || "").toUpperCase() === "APPROVED"
                            ? "info"
                            : (h.action || "").toUpperCase() === "REJECTED"
                            ? "error"
                            : "default"
                        }
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
                      <Chip
                        size="small"
                        label={h.type ?? "-"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={h.status ?? "-"}
                        color={
                          (h.status || "").toUpperCase() === "APPROVED"
                            ? "success"
                            : (h.status || "").toUpperCase() === "REJECTED"
                            ? "error"
                            : "default"
                        }
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
            px: 2,
            py: 1.5,
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
