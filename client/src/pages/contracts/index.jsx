import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogActions,
  Tooltip,
  Pagination,
  Chip,
  DialogContent,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Add, Edit, Delete, Visibility } from "@mui/icons-material";
import {
  fetchContractListApi,
  deleteContractApi,
  fetchContractDetailApi,
  createContractApi,
  updateContractApi,
} from "~/services/contract.service";
import { fetchEmployeeListApi } from "~/services/employee.service"; // <--- Thêm dòng này
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

const schema = yup.object().shape({
  contractCode: yup.string().required("Vui lòng nhập mã hợp đồng"),
  employeeId: yup.string().required("Chọn nhân viên"),
  type: yup.string().required("Chọn loại hợp đồng"),
  status: yup.string().required("Chọn trạng thái"),
  startDate: yup.string().required("Chọn ngày bắt đầu"),
  endDate: yup.string().required("Chọn ngày kết thúc"),
});

const contractTypes = [
  { value: "PERMANENT", label: "Chính thức" },
  { value: "PROBATION", label: "Thử việc" },
  { value: "TEMPORARY", label: "Thời vụ" },
  { value: "OTHER", label: "Khác" },
];

const contractStatus = [
  { value: "ACTIVE", label: "Đang hiệu lực" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "SIGNED", label: "Đã ký" },
  { value: "PENDING", label: "Chờ ký" },
];

function ContractList() {
  // State cho table
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  // State cho danh sách nhân viên (thay mockEmployeeList)
  const [employeeList, setEmployeeList] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState("add"); // add | edit | view
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // State cho form
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      contractCode: "",
      employeeId: "",
      type: "",
      status: "",
      startDate: "",
      endDate: "",
      fileUrl: "",
      note: "",
    },
  });

  // TODO: Lấy thông tin role từ redux hoặc context
  const account = { role: "HR" };
  const canEdit = ["HR", "ADMIN"].includes(account.role);

  // Thêm function fetchEmployees
  const fetchEmployees = async () => {
    const res = await fetchEmployeeListApi();
    setEmployeeList(Array.isArray(res.data) ? res.data : []);
  };

  const fetchContracts = async () => {
    setLoading(true);
    const res = await fetchContractListApi();
    setLoading(false);
    setContracts(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    fetchEmployees();   // Gọi lấy nhân viên khi vào trang
    fetchContracts();
  }, []);

  const handleAdd = () => {
    setFormMode("add");
    setSelected(null);
    reset();
    setDialogOpen(true);
  };

  const handleEdit = async (id) => {
    const res = await fetchContractDetailApi(id);
    if (res.status === 200) {
      setSelected(res.data);
      setFormMode("edit");
      reset({
        ...res.data,
        startDate: res.data.startDate || "",
        endDate: res.data.endDate || "",
      });
      setDialogOpen(true);
    }
  };

  const handleView = async (id) => {
    const res = await fetchContractDetailApi(id);
    if (res.status === 200) {
      setSelected(res.data);
      setFormMode("view");
      reset({
        ...res.data,
        startDate: res.data.startDate || "",
        endDate: res.data.endDate || "",
      });
      setDialogOpen(true);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    await deleteContractApi(deleteId);
    setOpenDelete(false);
    fetchContracts();
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    fetchContracts();
  };

  const onSubmit = async (formData) => {
    let res;
    if (formMode === "add") {
      res = await createContractApi(formData);
    } else {
      res = await updateContractApi(selected.id, formData);
    }
    if (res.status === 200 || res.status === 201) {
      handleFormSuccess();
    }
  };

  // Pagination logic
  const pageCount = Math.ceil(contracts.length / rowsPerPage);
  const pagedRows = contracts.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <Box sx={{ maxWidth: 2000, mx: "auto", mt: 4, p: 2 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Quản lý hợp đồng lao động
          </Typography>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              sx={{ borderRadius: 2 }}
            >
              Thêm hợp đồng
            </Button>
          )}
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã HĐ</TableCell>
              <TableCell>Nhân viên</TableCell>
              <TableCell>Loại HĐ</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Ngày bắt đầu</TableCell>
              <TableCell>Ngày kết thúc</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.contractCode}</TableCell>
                  <TableCell>{row.employeeName}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      color={
                        row.status === "ACTIVE"
                          ? "success"
                          : row.status === "EXPIRED"
                          ? "error"
                          : row.status === "SIGNED"
                          ? "primary"
                          : row.status === "PENDING"
                          ? "warning"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{row.startDate}</TableCell>
                  <TableCell>{row.endDate}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Xem chi tiết">
                      <IconButton onClick={() => handleView(row.id)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {canEdit && (
                      <>
                        <Tooltip title="Sửa">
                          <IconButton
                            color="secondary"
                            onClick={() => handleEdit(row.id)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(row.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Paper>

      {/* Dialog xác nhận xóa */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Bạn chắc chắn muốn xóa hợp đồng?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Hủy</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form Thêm/Sửa/Xem hợp đồng */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {formMode === "add"
            ? "Thêm hợp đồng"
            : formMode === "view"
            ? "Xem hợp đồng"
            : "Cập nhật hợp đồng"}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2}>
              <Controller
                name="contractCode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Mã hợp đồng"
                    fullWidth
                    error={!!errors.contractCode}
                    helperText={errors.contractCode?.message}
                    disabled={formMode === "view"}
                  />
                )}
              />
              <FormControl fullWidth error={!!errors.employeeId}>
                <InputLabel>Nhân viên</InputLabel>
                <Controller
                  name="employeeId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Nhân viên"
                      disabled={formMode === "view"}
                      value={field.value ?? ""}
                    >
                      {employeeList.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <Stack direction="row" spacing={2}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Ngày bắt đầu"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.startDate}
                      helperText={errors.startDate?.message}
                      disabled={formMode === "view"}
                    />
                  )}
                />
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Ngày kết thúc"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.endDate}
                      helperText={errors.endDate?.message}
                      disabled={formMode === "view"}
                    />
                  )}
                />
              </Stack>
              <FormControl fullWidth error={!!errors.type}>
                <InputLabel>Loại hợp đồng</InputLabel>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Loại hợp đồng"
                      disabled={formMode === "view"}
                    >
                      {contractTypes.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <FormControl fullWidth error={!!errors.status}>
                <InputLabel>Trạng thái</InputLabel>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Trạng thái"
                      disabled={formMode === "view"}
                    >
                      {contractStatus.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <Button
                variant="outlined"
                component="label"
                disabled={formMode === "view"}
              >
                Upload file hợp đồng
                <input type="file" hidden disabled={formMode === "view"} />
              </Button>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Ghi chú"
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={formMode === "view"}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Đóng</Button>
            {formMode !== "view" && (
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? (
                  <CircularProgress size={18} />
                ) : formMode === "add" ? (
                  "Thêm"
                ) : (
                  "Lưu"
                )}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default ContractList;
