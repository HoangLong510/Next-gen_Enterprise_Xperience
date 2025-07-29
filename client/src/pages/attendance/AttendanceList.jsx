import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  TextField,
  MenuItem,
  Pagination,
  Stack,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { getMyAttendancePageApi } from "~/services/attendance.service";
import { formatDate } from "~/utils/project.utils";
import { useNavigate } from "react-router-dom";
const statusOptions = [
  { label: "All", value: "" },
  { label: "Check-in", value: "CHECKED_IN" },
  { label: "Check-out", value: "CHECKED_OUT" },
  { label: "MISSING_CHECKOUT", value: "MISSING_CHECKOUT" },
  { label: "RESOLVED", value: "RESOLVED" },
  { label: "REJECTED", value: "REJECTED" },
];

export default function AttendanceList() {
  const [attendances, setAttendances] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const navigate = useNavigate();

  const fetchData = async () => {
    const res = await getMyAttendancePageApi({
      searchTerm: search,
      statusFilter,
      fromDate,
      toDate,
      pageNumber,
      pageSize: 8,
      sortBy: "desc",
    });
    setAttendances(res.data.attendances || []);
    setTotalPage(res.data.totalPage || 1);
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, fromDate, toDate, pageNumber]);

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Timekeeping history
      </Typography>

      <Stack spacing={2} direction={{ xs: "column", md: "row" }} mb={2}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={fetchData}>
                  <Search />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Status"
          select
          size="small"
          fullWidth
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="From date"
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <TextField
          label="To date"
          type="date"
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Check-in Time</TableCell>
              <TableCell>Check-out Time</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendances.map((att) => (
              <TableRow
                key={att.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => navigate(`/attendance/${att.id}`)}
              >
                <TableCell>{formatDate(att.checkInTime)}</TableCell>
                <TableCell>
                  {att.checkOutTime ? formatDate(att.checkOutTime) : "-"}
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={
                      att.status === "CHECKED_OUT"
                        ? "green"
                        : att.status === "MISSING_CHECKOUT"
                        ? "orange"
                        : att.status === "REJECTED"
                        ? "red"
                        : "blue"
                    }
                  >
                    {att.status}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack mt={2} alignItems="center">
        <Pagination
          count={totalPage}
          page={pageNumber}
          onChange={(e, val) => setPageNumber(val)}
          color="primary"
        />
      </Stack>
    </Box>
  );
}
