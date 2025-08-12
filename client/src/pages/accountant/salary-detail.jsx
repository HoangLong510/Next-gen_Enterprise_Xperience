import React from "react";

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import {
  getSalaryByIdApi,
  getSalaryHistoryByEmployeeApi,
} from "~/services/accountant/salary.service";
import { fetchAccountDataApi } from "~/services/auth.service";

import { formatCurrency } from "~/utils/function";

export default function SalaryDetail() {
  const { id } = useParams();
  const [salary, setSalary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedId, setSelectedId] = useState("ALL");

  useEffect(() => {
    fetchDetailAndHistory();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetchAccountDataApi();
      setCurrentUser(res.data);
    } catch (e) {
      console.error("Error fetching current user", e);
    }
  };
  
  const fetchDetailAndHistory = async () => {
    try {
      const res = await getSalaryByIdApi(id);
      const current = res.data.data;
      setSalary(current);

      if (current?.employee?.code) {
        const resHis = await getSalaryHistoryByEmployeeApi(
          current.employee.code
        );
        setHistory(resHis.data || []);
      }

      setSelectedId(current.id);
    } catch (err) {
      console.error("Failed to fetch salary detail", err);
    } finally {
      setLoading(false);
    }
  };

  const allSalaries = useMemo(() => {
    const combined = [
      ...history.filter((h) => h.id !== salary?.id),
      salary,
    ].filter(Boolean);
    return combined.sort((a, b) => b.year - a.year || b.month - a.month);
  }, [salary, history]);

  const selectedSalary = allSalaries.find((item) => item.id === selectedId);

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedSalary && selectedId !== "ALL") return null;

  const totals = allSalaries.reduce(
    (acc, cur) => {
      acc.baseSalary += cur.baseSalary || 0;
      acc.actualSalary += cur.actualSalary || 0;
      acc.allowanceLunch += cur.allowanceLunch || 0;
      acc.allowancePhone += cur.allowancePhone || 0;
      acc.allowanceResponsibility += cur.allowanceResponsibility || 0;
      acc.totalSalary += cur.totalSalary || 0;
      acc.deductionBhxh += cur.deductionBhxh || 0;
      acc.deductionBhyt += cur.deductionBhyt || 0;
      acc.deductionBhtn += cur.deductionBhtn || 0;
      acc.total += cur.total || 0;
      acc.workingDays += cur.workingDays || 0;
      acc.totalPaid += cur.status === "PAID" ? cur.total || 0 : 0;
      return acc;
    },
    {
      baseSalary: 0,
      actualSalary: 0,
      allowanceLunch: 0,
      allowancePhone: 0,
      allowanceResponsibility: 0,
      totalSalary: 0,
      deductionBhxh: 0,
      deductionBhyt: 0,
      deductionBhtn: 0,
      total: 0,
      workingDays: 0,
      totalPaid: 0,
    }
  );

  return (
    <Box sx={{ width: "100%", mx: "auto", my: 4 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {selectedId === "ALL"
          ? "Danh Sách Tất Cả Phiếu Lương"
          : `Phiếu Lương Tháng ${selectedSalary?.month || "-"}/${
              selectedSalary?.year || "-"
            }`}
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Month</InputLabel>
        <Select
          value={selectedId || "ALL"}
          label="Chọn Tháng"
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <MenuItem value="ALL">Tất cả</MenuItem>
          {allSalaries.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              Month {item.month}/{item.year}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "primary.main" }}>
                <TableCell rowSpan={2} sx={{ color: "white" }}>
                 Position
                </TableCell>
                <TableCell rowSpan={2} sx={{ color: "white" }}>
                  Lương cơ bản
                </TableCell>
                <TableCell rowSpan={2} sx={{ color: "white" }}>
                  Ngày công
                </TableCell>
                <TableCell rowSpan={2} sx={{ color: "white" }}>
                  Lương thực tế
                </TableCell>

                <TableCell colSpan={3} align="center" sx={{ color: "white" }}>
                  PHỤ CẤP
                </TableCell>
                <TableCell colSpan={4} align="center" sx={{ color: "white" }}>
                  KHẤU TRỪ
                </TableCell>

                <TableCell rowSpan={2} sx={{ color: "white" }}>
                  Thực nhận
                </TableCell>
                <TableCell rowSpan={2} sx={{ color: "white" }}>
                  Phương thức
                </TableCell>
                <TableCell rowSpan={2} sx={{ color: "white" }}>
                  Trạng thái
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ color: "white" }}>
                  Tạo bởi
                </TableCell>
              </TableRow>

              <TableRow sx={{ backgroundColor: "primary.main" }}>
                <TableCell sx={{ color: "white" }}>Ăn trưa</TableCell>
                <TableCell sx={{ color: "white" }}>Điện thoại</TableCell>
                <TableCell sx={{ color: "white" }}>Trách nhiệm</TableCell>

                <TableCell sx={{ color: "white" }}>BHXH</TableCell>
                <TableCell sx={{ color: "white" }}>BHYT</TableCell>
                <TableCell sx={{ color: "white" }}>BHTN</TableCell>
                <TableCell sx={{ color: "white" }}>Tổng khấu trừ</TableCell>

                <TableCell sx={{ color: "white" }}>Người tạo</TableCell>
                <TableCell sx={{ color: "white" }}>Ngày tạo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedId === "ALL" &&
                Object.entries(
                  allSalaries.reduce((acc, cur) => {
                    const key = `${cur.month}/${cur.year}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(cur);
                    return acc;
                  }, {})
                ).map(([monthYear, list]) => (
                  <React.Fragment key={monthYear}>
                    <TableRow sx={{ backgroundColor: "#f0f4ff" }}>
                      <TableCell colSpan={16}>
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          color="primary"
                        >
                          Tháng {monthYear}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    {list.map((item) => (
                      <TableRow hover key={item.id}>
                        <TableCell>{item.employee?.position}</TableCell>
                        <TableCell>{formatCurrency(item.baseSalary)}</TableCell>
                        <TableCell>{item.workingDays}</TableCell>
                        <TableCell>
                          {formatCurrency(item.actualSalary)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.allowanceLunch)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.allowancePhone)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.allowanceResponsibility)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.totalSalary)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.deductionBhxh)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.deductionBhyt)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.deductionBhtn)}
                        </TableCell>
                        <TableCell>{formatCurrency(item.total)}</TableCell>
                        <TableCell>{item.paymentMethod}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.status}
                            color={
                              item.status === "PAID"
                                ? "success"
                                : item.status === "APPROVED"
                                ? "info"
                                : item.status === "PENDING"
                                ? "warning"
                                : item.status === "CANCELED"
                                ? "error"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{item.createdBy}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(item.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.createdAt).toLocaleTimeString(
                              "vi-VN"
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}

              {selectedId !== "ALL" && selectedSalary && (
                <TableRow hover key={selectedSalary.id}>
                  <TableCell>{selectedSalary.employee?.position}</TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.baseSalary)}
                  </TableCell>
                  <TableCell>{selectedSalary.workingDays}</TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.actualSalary)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.allowanceLunch)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.allowancePhone)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.allowanceResponsibility)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.totalSalary)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.deductionBhxh)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.deductionBhyt)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(selectedSalary.deductionBhtn)}
                  </TableCell>
                  <TableCell>{formatCurrency(selectedSalary.total)}</TableCell>
                  <TableCell>{selectedSalary.paymentMethod}</TableCell>
                  <TableCell>
                    <Chip
                      label={selectedSalary.status}
                      color={
                        selectedSalary.status === "PAID"
                          ? "success"
                          : selectedSalary.status === "APPROVED"
                          ? "info"
                          : selectedSalary.status === "PENDING"
                          ? "warning"
                          : selectedSalary.status === "CANCELED"
                          ? "error"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                 

                  <TableCell>{selectedSalary.createdBy}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(selectedSalary.createdAt).toLocaleDateString(
                        "vi-VN"
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(selectedSalary.createdAt).toLocaleTimeString(
                        "vi-VN"
                      )}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {selectedId === "ALL" && (
                <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
                  <TableCell>
                    <strong>Tổng</strong>
                  </TableCell>
                  <TableCell>{formatCurrency(totals.baseSalary)}</TableCell>
                  <TableCell>{totals.workingDays}</TableCell>
                  <TableCell>{formatCurrency(totals.actualSalary)}</TableCell>
                  <TableCell>{formatCurrency(totals.allowanceLunch)}</TableCell>
                  <TableCell>{formatCurrency(totals.allowancePhone)}</TableCell>
                  <TableCell>
                    {formatCurrency(totals.allowanceResponsibility)}
                  </TableCell>
                  <TableCell>{formatCurrency(totals.totalSalary)}</TableCell>
                  <TableCell>{formatCurrency(totals.deductionBhxh)}</TableCell>
                  <TableCell>{formatCurrency(totals.deductionBhyt)}</TableCell>
                  <TableCell>{formatCurrency(totals.deductionBhtn)}</TableCell>
                  <TableCell>{formatCurrency(totals.total)}</TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {selectedId === "ALL" && (
          <Box sx={{ mt: 2, textAlign: "right" }}>
            <Typography
              fontWeight="bold"
              variant="subtitle1"
              color="success.main"
            >
              Tổng thực nhận đã thanh toán: {formatCurrency(totals.totalPaid)}
            </Typography>
          </Box>
        )}

        {selectedId !== "ALL" && selectedSalary?.fileUrl && (
          <Box sx={{ mt: 2 }}>
            <a href={selectedSalary.fileUrl} target="_blank" rel="noreferrer">
              <DownloadIcon sx={{ mr: 1 }} />
              Tải file đính kèm
            </a>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
