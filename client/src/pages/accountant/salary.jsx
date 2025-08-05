"use client";

import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Select,
  Drawer,
  Card,
  CardContent,
  Badge,
  IconButton,
  CardHeader,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Avatar,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadIcon from "@mui/icons-material/Download";
import { Add as AddIcon, Close as CloseIcon } from "@mui/icons-material";

import SingleSalaryForm from "~/pages/accountant/form-single-payslip";
import MultipleSalaryForm from "~/pages/accountant/form-multiple-payslip";

import {
  createSalaryApi,
  getAllDepartmentsApi,
  generateMonthlySalaryApi,
  getEmployeeBasicInfoApi,
  getSalarySummaryApi,
} from "~/services/accountant/salary.service";
import { formatCurrency } from "~/utils/function";
import CustomAvatar from "~/components/custom-avatar";

const positionsList = ["EMPLOYEE", "MANAGER", "DIRECTOR", "INTERN"];

export default function PayrollTable() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [formType, setFormType] = useState(null);
  const [singleInput, setSingleInput] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [empInfo, setEmpInfo] = useState(null);
  const [data, setData] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  const dispatch = useDispatch();

  const [filters, setFilters] = useState({
    department: "",
    position: "",
    name: "",
  });

  const handleCreateSingle = () => setFormType("single");
  const handleCreateMultiple = () => setFormType("multiple");

  useEffect(() => {
    const fetchDepartments = async () => {
      const res = await getAllDepartmentsApi();
      if (res.status === 200) {
        setDepartmentsList(res.data);
      } else {
        console.error("Lỗi lấy danh sách phòng ban:", res.message);
      }
    };

    fetchDepartments();
  }, []);

  const fetchSalarySummary = async () => {
    const res = await getSalarySummaryApi(filters);
    if (res.status === 200) {
      const grouped = groupSalariesByMonthAndDepartment(res.data);
      setData(grouped);
    } else {
      console.error("Lỗi lấy tổng hợp lương:", res.message);
    }
  };

  useEffect(() => {
    fetchSalarySummary();
  }, [filters]);

  const calculateTotalField = (field) => {
    return data.reduce((sum, monthGroup) => {
      return (
        sum +
        monthGroup.departments.reduce((deptSum, dept) => {
          return (
            deptSum +
            dept.salaries.reduce(
              (salarySum, sal) => salarySum + (sal[field] || 0),
              0
            )
          );
        }, 0)
      );
    }, 0);
  };

  const totalBaseSalary = calculateTotalField("baseSalary");
  const totalActualReceived = calculateTotalField("actualSalary");

  const groupSalariesByMonthAndDepartment = (summaryData) => {
    const map = new Map();

    summaryData.forEach((item) => {
      const key = `${item.month}/${item.year}`;
      if (!map.has(key)) {
        map.set(key, new Map());
      }

      const deptMap = map.get(key);
      const dept = item.department || "Không xác định";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept).push(item);
    });

    return Array.from(map.entries()).map(([monthYear, deptMap]) => ({
      monthYear,
      departments: Array.from(deptMap.entries()).map(([name, salaries]) => ({
        name,
        salaries,
      })),
    }));
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return now.getMonth() + 1;
  };

  const getCurrentYear = () => {
    const now = new Date();
    return now.getFullYear();
  };

  const getStandardWorkingDays = (month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  const standardWorkingDays = getStandardWorkingDays(currentMonth, currentYear);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      department: "all",
      position: "all",
      name: "",
    });
  };
  const calculateTotalActualReceived = () => {
    return data.reduce(
      (sum, dept) =>
        sum +
        dept.salaries.reduce((subSum, sal) => subSum + (sal.total || 0), 0),
      0
    );
  };
  const handleGenerateSalary = async () => {
    const res = await generateMonthlySalaryApi({
      year: currentYear,
      month: currentMonth,
    });
    if (res.status === 200) {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchSalarySummary();
    } else {
      dispatch(setPopup({ type: "error", message: res.message }));
    }
  };

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      <Box display="flex" justifyContent="space-between" flexWrap="wrap" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            BẢNG LƯƠNG
          </Typography>
          <Typography variant="subtitle1">
            Tháng: {currentMonth}/{currentYear}
          </Typography>
          <Typography variant="subtitle1">
            {`Ngày công chuẩn: ${standardWorkingDays}`}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={handleGenerateSalary}>
            Tính lương tháng {currentMonth}/{currentYear}
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setDrawerOpen(true)}
          >
            Tạo Phiếu Lương
          </Button>
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 500 } }}
      >
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              {formType === "single"
                ? "Tạo Một Phiếu Lương"
                : formType === "multiple"
                ? "Tạo Nhiều Phiếu Lương"
                : "Tạo Phiếu Lương"}
            </Typography>
            <IconButton
              onClick={() => {
                setDrawerOpen(false);
                setFormType(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {!formType && (
            <>
              <Card
                onClick={() => setFormType("single")}
                sx={{ cursor: "pointer", "&:hover": { boxShadow: 6 } }}
              >
                <CardHeader
                  title="Tạo Một Phiếu"
                  titleTypographyProps={{ variant: "subtitle1" }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Tạo phiếu lương cho một nhân viên cụ thể
                  </Typography>
                  <Button fullWidth>Chọn Nhân Viên</Button>
                </CardContent>
              </Card>

              <Card
                onClick={() => setFormType("multiple")}
                sx={{ cursor: "pointer", "&:hover": { boxShadow: 6 } }}
              >
                <CardHeader
                  title="Tạo Nhiều Phiếu"
                  titleTypographyProps={{ variant: "subtitle1" }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Tạo phiếu lương hàng loạt cho nhiều nhân viên
                  </Typography>
                  <Button fullWidth variant="outlined">
                    Chọn Phòng Ban
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {formType === "single" && (
            <SingleSalaryForm
              onSuccess={() => {
                fetchSalarySummary();
                setDrawerOpen(false);
                setFormType(null);
              }}
            />
          )}
          {formType === "multiple" && (
            <MultipleSalaryForm
              onClose={() => {
                setDrawerOpen(false);
                setFormType(null);
              }}
            />
          )}
        </Box>
      </Drawer>

      <Button
        variant="outline"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2"
      >
        <FilterListIcon className="h-4 w-4" />
        {showFilters ? "Ẩn Bộ Lọc" : "Hiện Bộ Lọc"}
      </Button>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ p: 2 }}>
          <CardHeader
            title={
              <Typography variant="h6" fontWeight="bold">
                Bộ Lọc
              </Typography>
            }
            sx={{ pb: 0 }}
          />
          <CardContent>
            <Box
              display="grid"
              gridTemplateColumns={{
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr 1fr",
              }}
              gap={2}
            >
              {/* Phòng Ban */}
              <FormControl fullWidth>
                <InputLabel id="department-label">Phòng Ban</InputLabel>
                <Select
                  labelId="department-label"
                  value={filters.department}
                  label="Phòng Ban"
                  onChange={(e) =>
                    handleFilterChange("department", e.target.value)
                  }
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {departmentsList.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Chức Vụ */}
              <FormControl fullWidth>
                <InputLabel id="position-label">Chức Vụ</InputLabel>
                <Select
                  labelId="position-label"
                  value={filters.position}
                  label="Chức Vụ"
                  onChange={(e) =>
                    handleFilterChange("position", e.target.value)
                  }
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {positionsList.map((position) => (
                    <MenuItem key={position} value={position}>
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Tên Nhân Viên */}
              <TextField
                fullWidth
                label="Tên Nhân Viên"
                placeholder="Nhập tên..."
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
              />

              {/* Nút Xóa Bộ Lọc */}
              <Box display="flex" alignItems="flex-end">
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  startIcon={<CloseIcon />}
                  fullWidth
                  sx={{ height: "56px" }}
                >
                  Xóa Bộ Lọc
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Payroll Table */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 1200 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#0d47a1" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  #
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Mã Nhân Viên
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Chức Vụ
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Lương Cơ Bản
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Người Tạo
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Ngày Tạo
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Thực Tế Nhận
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Trạng Thái
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Tệp PDF
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((monthGroup, monthIndex) => (
                <React.Fragment key={monthIndex}>
                  <TableRow sx={{ backgroundColor: "#bbdefb" }}>
                    <TableCell
                      colSpan={9}
                      sx={{ fontWeight: "bold", color: "#0d47a1" }}
                    >
                      Tháng {monthGroup.monthYear}
                    </TableCell>
                  </TableRow>
                  {monthGroup.departments.map((department, deptIndex) => (
                    <React.Fragment key={deptIndex}>
                      <TableRow sx={{ backgroundColor: "#e3f2fd" }}>
                        <TableCell
                          colSpan={9}
                          sx={{ fontWeight: "bold", color: "#1976d2" }}
                        >
                          {department.name}
                        </TableCell>
                      </TableRow>
                      {department.salaries.map((item, index) => (
                        <TableRow
                          key={item.id}
                          hover
                          onClick={() =>
                            navigate(`/finance/salary/detail/${item.id}`)
                          }
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.role}</TableCell>
                          <TableCell>
                            {formatCurrency(item.baseSalary)}
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <CustomAvatar
                                src={item.createdByAvatar}
                                alt={item.createdBy}
                                sx={{ width: 30, height: 30 }}
                              />
                              <Typography variant="body2" noWrap>
                                {item.createdBy || ""}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {new Date(item.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(item.createdAt).toLocaleTimeString(
                                "vi-VN"
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell
                            style={{ fontWeight: "bold", color: "#2e7d32" }}
                          >
                            {formatCurrency(item.actualSalary)}
                          </TableCell>
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
                            />
                          </TableCell>
                          <TableCell>
                            {item.fileUrl ? (
                              <Button
                                variant="outlined"
                                size="small"
                                href={item.fileUrl}
                                target="_blank"
                              >
                                Tải xuống
                              </Button>
                            ) : (
                              "Không có"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ width: "100%", p: 3 }}>
            <Typography
              variant="h6"
              align="right"
              color="success.main"
              fontWeight="bold"
            >
              Tổng thực nhận: {formatCurrency(totalActualReceived)}
            </Typography>
          </Box>
        </TableContainer>
      </Box>
    </Box>
  );
}
