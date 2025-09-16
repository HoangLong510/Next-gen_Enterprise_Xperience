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
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { getMyAttendancePageApi } from "~/services/attendance.service";
import { formatDate } from "~/utils/project.utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HistoryIcon from "@mui/icons-material/History";

export default function AttendanceList() {
  const { t } = useTranslation("attendance_page");

  const [attendances, setAttendances] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const statusOptions = [
    { label: t("all"), value: "" },
    { label: t("checked_in"), value: "CHECKED_IN" },
    { label: t("checked_out"), value: "CHECKED_OUT" },
    { label: t("missing_checkout"), value: "MISSING_CHECKOUT" },
    { label: t("resolved"), value: "RESOLVED" },
    { label: t("rejected"), value: "REJECTED" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMyAttendancePageApi({
        statusFilter,
        fromDate,
        toDate,
        pageNumber,
        pageSize: 8,
        sortBy: "desc",
      });
      setAttendances(res.data.attendances || []);
      setTotalPage(res.data.totalPage || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, fromDate, toDate, pageNumber]);

  return (
    <Box sx={{ maxWidth: "1600px", mx: "auto", mt: 3, p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          bgcolor: "primary.main",
          color: "white",
          borderRadius: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <HistoryIcon sx={{ fontSize: 40 }} />
          {t("history")}
        </Typography>
      </Paper>

      {/* Bộ lọc */}
      <Card elevation={2} sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{ mb: 3, color: "text.primary", fontWeight: 500 }}
          >
            {t("search")}
          </Typography>
          <Stack
            spacing={3}
            direction={{ xs: "column", md: "row" }}
            alignItems="end"
          >
            <TextField
              label={t("status")}
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
              label={t("fromDate")}
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <TextField
              label={t("toDate")}
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading ? (
        <Card
          elevation={1}
          sx={{ p: 6, textAlign: "center", borderRadius: 2 }}
        >
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {t("loading")}
          </Typography>
        </Card>
      ) : attendances.length === 0 ? (
        <Card
          elevation={1}
          sx={{ p: 6, textAlign: "center", borderRadius: 2 }}
        >
          <HistoryIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {t("noData")}
          </Typography>
        </Card>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "grey.100" }}>
                <TableCell>{t("checkInTime")}</TableCell>
                <TableCell>{t("checkOutTime")}</TableCell>
                <TableCell>{t("status")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendances.map((att) => (
                <TableRow
                  key={att.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "grey.50" },
                  }}
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
                          ? "success.main"
                          : att.status === "MISSING_CHECKOUT"
                          ? "warning.main"
                          : att.status === "REJECTED"
                          ? "error.main"
                          : "info.main"
                      }
                    >
                      {t(att.status.toLowerCase())}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      <Stack mt={3} alignItems="center">
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
