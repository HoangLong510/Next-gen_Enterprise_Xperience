"use client";

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Select,
  Card,
  CardContent,
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
  Switch,
  FormControlLabel,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";

import {
  getAllDepartmentsApi,
  generateMonthlySalaryApi,
  getSalarySummaryApi,
  getAllRolesApi,
  updateSalaryApi,
  submitAllSalariesApi,
  reviewAllSalariesApi,
  approveAllFinalSalariesApi,
  sendAllSalaryEmailsApi,
} from "~/services/accountant/salary.service";
import { formatCurrency } from "~/utils/function";

export default function PayrollTable() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const account = useSelector((state) => state.account.value);

  const [showFilters, setShowFilters] = useState(false);
  const [rolesList, setRolesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [data, setData] = useState([]);
  const [autoSalary, setAutoSalary] = useState(false);
  const [autoDay, setAutoDay] = useState(1);

  const [filters, setFilters] = useState({
    department: "",
    position: "",
    code: "",
    role: "",
  });

  const [editingCell, setEditingCell] = useState({ rowId: null, field: null });

  // fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      const res = await getAllDepartmentsApi();
      if (res.status === 200) {
        setDepartmentsList(res.data);
      }
    };
    fetchDepartments();
  }, []);

  // fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      const res = await getAllRolesApi();
      if (res.status === 200) {
        setRolesList(res.data);
      }
    };
    fetchRoles();
  }, []);

  // fetch salaries
  const fetchSalarySummary = async () => {
    const res = await getSalarySummaryApi(filters);
    if (res.status === 200) {
      const grouped = groupSalariesByMonthAndDepartment(res.data);
      setData(grouped);
    } else {
      console.error("Error fetching salary summary:", res.message);
    }
  };

  useEffect(() => {
    fetchSalarySummary();
  }, [filters]);

  const groupSalariesByMonthAndDepartment = (summaryData) => {
    const map = new Map();
    summaryData.forEach((item) => {
      const key = `${item.month}/${item.year}`;
      if (!map.has(key)) {
        map.set(key, new Map());
      }
      const deptMap = map.get(key);
      const dept = item.department || "Not determined";
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

  // update inline cell
  const handleEdit = async (rowId, field, value) => {
    setData((prev) =>
      prev.map((monthGroup) => ({
        ...monthGroup,
        departments: monthGroup.departments.map((dept) => ({
          ...dept,
          salaries: dept.salaries.map((sal) =>
            sal.id === rowId ? { ...sal, [field]: value } : sal
          ),
        })),
      }))
    );
    await updateSalaryApi(rowId, { [field]: value });
  };

  // filters
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      department: "",
      position: "",
      code: "",
      role: "",
    });
  };

  // generate salary
  const getCurrentMonth = () => new Date().getMonth() + 1;
  const getCurrentYear = () => new Date().getFullYear();

  const handleGenerateSalary = async () => {
    const res = await generateMonthlySalaryApi({
      year: getCurrentYear(),
      month: getCurrentMonth(),
    });
    if (res.status === 200) {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchSalarySummary();
    } else {
      dispatch(setPopup({ type: "error", message: res.message }));
    }
  };

  // submit all
  const handleSubmitAll = async () => {
    const res = await submitAllSalariesApi(getCurrentYear(), getCurrentMonth());
    if (res.status === 200) {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchSalarySummary();
    } else {
      dispatch(setPopup({ type: "error", message: res.message }));
    }
  };

  // review all
  const handleReviewAll = async () => {
    const res = await reviewAllSalariesApi(getCurrentYear(), getCurrentMonth());
    if (res.status === 200) {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchSalarySummary();
    } else {
      dispatch(setPopup({ type: "error", message: res.message }));
    }
  };

  // approve all final
  const handleApproveAllFinal = async () => {
    const res = await approveAllFinalSalariesApi(
      getCurrentYear(),
      getCurrentMonth()
    );
    if (res.status === 200) {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchSalarySummary();
    } else {
      dispatch(setPopup({ type: "error", message: res.message }));
    }
  };

  // send all salary slips
  const handleSendAllSalary = async () => {
    const res = await sendAllSalaryEmailsApi(
      getCurrentYear(),
      getCurrentMonth()
    );
    if (res.status === 200) {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchSalarySummary();
    } else {
      dispatch(setPopup({ type: "error", message: res.message }));
    }
  };

  const renderEditableCell = (item, field, formatter = (v) => v) => {
    return editingCell.rowId === item.id && editingCell.field === field ? (
      <TextField
        value={item[field]}
        onChange={(e) => handleEdit(item.id, field, e.target.value)}
        onBlur={() => setEditingCell({ rowId: null, field: null })}
        size="small"
        autoFocus
      />
    ) : (
      <Box
        onDoubleClick={() => setEditingCell({ rowId: item.id, field })}
        sx={{ cursor: "pointer" }}
      >
        {formatter(item[field])}
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      <Box display="flex" justifyContent="space-between" flexWrap="wrap" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            SALARY SHEET
          </Typography>
          <Typography variant="subtitle1">
            Month: {getCurrentMonth()}/{getCurrentYear()}
          </Typography>
        </Box>

        {/* 🔹 Action buttons theo role */}
        <Stack direction="row" spacing={2} alignItems="center">
          {account.role === "ACCOUNTANT" && (
            <Button variant="contained" onClick={handleSubmitAll}>
              Submit All Salaries
            </Button>
          )}

          {account.role === "CHIEFACCOUNTANT" && (
            <Button
              variant="contained"
              color="warning"
              onClick={handleReviewAll}
            >
              Review All Salaries
            </Button>
          )}

          {account.role === "MANAGER" && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={handleApproveAllFinal}
              >
                Approve All Final
              </Button>
              <Button
                variant="contained"
                color="info"
                onClick={handleSendAllSalary}
              >
                Send All Slips
              </Button>
            </>
          )}
        </Stack>
      </Box>

      <Button
        variant="outline"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2"
      >
        <FilterListIcon className="h-4 w-4" />
        {showFilters ? "Hide Filters" : "Show Filters"}
      </Button>

      {showFilters && (
        <Card sx={{ p: 2, mt: 2 }}>
          <CardHeader
            title={<Typography variant="h6">Filter</Typography>}
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
              <FormControl fullWidth>
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  value={filters.department}
                  onChange={(e) =>
                    handleFilterChange("department", e.target.value)
                  }
                >
                  <MenuItem value="">All</MenuItem>
                  {departmentsList.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  value={filters.role}
                  onChange={(e) => handleFilterChange("role", e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {rolesList.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Code"
                value={filters.code}
                onChange={(e) => handleFilterChange("code", e.target.value)}
              />

              <Box display="flex" alignItems="flex-end">
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  startIcon={<CloseIcon />}
                  fullWidth
                >
                  Clear
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Payroll Table */}
      <Box sx={{ width: "100%", overflowX: "auto", mt: 3 }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 1200 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#0d47a1" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  #
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Code
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Role
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Base Salary
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Actual Salary
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Total Allowance
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Deductions
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Net Pay
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                  Status
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
                      {monthGroup.monthYear}
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
                      {department.salaries.map((item, index) => {
                        return (
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
                              {renderEditableCell(
                                item,
                                "baseSalary",
                                formatCurrency
                              )}
                            </TableCell>
                            <TableCell>
                              {renderEditableCell(
                                item,
                                "actualSalary",
                                formatCurrency
                              )}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.totalAllowance)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.totalDeduction)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.status}
                                color={
                                  item.status === "PAID"
                                    ? "success"
                                    : item.status === "APPROVED"
                                    ? "info"
                                    : item.status === "DRAFT"
                                    ? "warning"
                                    : "default"
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
