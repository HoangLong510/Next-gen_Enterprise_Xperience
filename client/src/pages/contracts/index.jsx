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
  FormHelperText,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  BorderColor,
  Download,
} from "@mui/icons-material";
import {
  fetchContractListApi,
  deleteContractApi,
  fetchContractDetailApi,
  createContractApi,
  updateContractApi,
  signContractApi,
  exportContractWordApi,
} from "~/services/contract.service";
import { fetchEmployeeListApi } from "~/services/employee.service";
import { fetchAccountDataApi } from "~/services/auth.service";
import { getMySignatureSampleApi } from "~/services/contract.service";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import SignatureCanvas from "react-signature-canvas";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

// Helpers
const statusColor = (s) =>
  s === "ACTIVE"
    ? "success"
    : s === "SIGNED_BY_MANAGER"
    ? "warning"
    : s === "PENDING"
    ? "default"
    : "error";

const typeLabel = (t) =>
  t === "PERMANENT"
    ? "Chính thức"
    : t === "PROBATION"
    ? "Thử việc"
    : t === "TEMPORARY"
    ? "Thời vụ"
    : t;

// ---- FE schema: nhẹ nhàng, khớp rule BE ----
const today0 = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const schema = yup.object().shape({
  contractCode: yup
    .string()
    .trim()
    .required("Mã hợp đồng là bắt buộc")
    .matches(/^$|^NEX-\d{4}-\d{4}$/, "Format phải là NEX-YYYY-SSSS (vd: NEX-2025-0001)"),
  employeeId: yup
    .number()
    .typeError("Select an employee")
    .required("Select an employee"),
  startDate: yup
    .date()
    .typeError("Select start date")
    .required("Select start date")
    .test("not-past", "Start date cannot be in the past", (v) => {
      if (!v) return true;
      const sv = new Date(v); sv.setHours(0,0,0,0);
      return sv.getTime() >= today0().getTime();
    }),
  endDate: yup
    .date()
    .typeError("Select end date")
    .required("Select end date")
    .test("after-start", "End date must be AFTER start date", (v, ctx) => {
      const sd = ctx.parent.startDate;
      if (!v || !sd) return true;
      return new Date(v).getTime() > new Date(sd).getTime(); // strict
    }),
  type: yup
    .string()
    .oneOf(["PERMANENT", "PROBATION", "TEMPORARY"])
    .required("Select a contract type"),
  note: yup.string().nullable(),
  basicSalary: yup
    .number()
    .typeError("Enter a valid number")
    .moreThan(0, "Salary must be > 0")
    .required("Basic salary is required"),
});

export default function ContractPage() {
  const dispatch = useDispatch();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [account, setAccount] = useState(null);

  // Create / Edit form
  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState("add"); // add | edit
  const [selected, setSelected] = useState(null);
  const [employees, setEmployees] = useState([]);

  // View detail dialog
  const [openDetail, setOpenDetail] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Sign dialog
  const [signOpen, setSignOpen] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [useSavedSignature, setUseSavedSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");

  // hook-form
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      contractCode: "",
      employeeId: "",
      startDate: "",
      endDate: "",
      type: "",
      note: "",
      basicSalary: "",
    },
  });

  const toISODate = (d) => {
    if (!d) return null;
    if (typeof d === "string") return d;
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helpers tính khoảng theo rule BE
  const inclusiveDays = (startISO, endISO) => {
    const sd = new Date(startISO);
    const ed = new Date(endISO);
    const diff = Math.floor((ed - sd) / 86400000);
    return diff + 1; // inclusive
  };
  const inclusiveMonths = (startISO, endISO) => {
    const s = new Date(startISO);
    const e = new Date(endISO);
    // chênh lệch theo tháng, inclusive (giống BE)
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  };

  // Submit form
  const onSubmit = async (formData) => {
    // Chuẩn hóa dữ liệu gửi
    const payload = {
      ...formData,
      employeeId: Number(formData.employeeId || 0),
      startDate: toISODate(formData.startDate),
      endDate: toISODate(formData.endDate),
      basicSalary:
        formData.basicSalary === "" ? null : Number(formData.basicSalary),
      // contractCode: cho BE tự sinh nếu để trống
      contractCode:
        (formData.contractCode || "").trim() === ""
          ? null
          : String(formData.contractCode).trim(),
    };

    // FE checks nhẹ cho trải nghiệm (BE vẫn là nguồn sự thật)

    // 1) startDate không quá khứ (today OK)
    if (payload.startDate) {
      const sd = new Date(payload.startDate); sd.setHours(0,0,0,0);
      if (sd.getTime() < today0().getTime()) {
        dispatch(setPopup({ type: "error", message: "Start date cannot be in the past" }));
        return;
      }
    }

    // 2) endDate > startDate (strict)
    if (payload.startDate && payload.endDate) {
      const sd = new Date(payload.startDate);
      const ed = new Date(payload.endDate);
      if (!(ed.getTime() > sd.getTime())) {
        dispatch(setPopup({ type: "error", message: "End date must be AFTER start date" }));
        return;
      }
    }

    // 3) Ràng buộc theo loại
    if (payload.type && payload.startDate && payload.endDate) {
      if (payload.type === "PROBATION") {
        const d = inclusiveDays(payload.startDate, payload.endDate);
        if (d > 64) {
          dispatch(setPopup({ type: "error", message: "Probation cannot exceed 64 days" }));
          return;
        }
      }
      if (payload.type === "TEMPORARY") {
        const m = inclusiveMonths(payload.startDate, payload.endDate);
        if (m > 12) {
          dispatch(setPopup({ type: "error", message: "Temporary cannot exceed 12 months" }));
          return;
        }
      }
    }

    // 4) Lương > 0
    if (payload.basicSalary == null || isNaN(payload.basicSalary) || payload.basicSalary <= 0) {
      dispatch(setPopup({ type: "error", message: "Salary must be > 0" }));
      return;
    }

    const res =
      formMode === "add"
        ? await createContractApi(payload)
        : await updateContractApi(selected.id, payload);

    if (res.status === 200 || res.status === 201) {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "Success",
        })
      );
      setOpenForm(false);
      loadData();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Error",
        })
      );
    }
  };

  const openAdd = () => {
    setFormMode("add");
    reset({
      contractCode: "",
      employeeId: "",
      startDate: "",
      endDate: "",
      type: "",
      note: "",
      basicSalary: "",
    });
    setOpenForm(true);
  };

  const handleEdit = async (id) => {
    setFormMode("edit");
    setSelected(rows.find((r) => r.id === id));
    setOpenForm(true);
    // Load detail to fill form
    setLoadingDetail(true);
    const res = await fetchContractDetailApi(id);
    setLoadingDetail(false);
    if (res.status === 200 && res.data) {
      const d = res.data;
      reset({
        contractCode: d.contractCode || "",
        employeeId: d.employeeId || "",
        startDate: d.startDate || "",
        endDate: d.endDate || "",
        type: d.type || "",
        note: d.note || "",
        basicSalary: d.basicSalary ?? "",
      });
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Load detail failed",
        })
      );
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Xoá hợp đồng này?");
    if (!confirm) return;
    const res = await deleteContractApi(id);
    if (res.status === 200) {
      dispatch(
        setPopup({ type: "success", message: res.message || "Deleted" })
      );
      loadData();
    } else {
      dispatch(
        setPopup({ type: "error", message: res.message || "Delete failed" })
      );
    }
  };

  const handleView = async (id) => {
    setOpenDetail(true);
    setLoadingDetail(true);
    const res = await fetchContractDetailApi(id);
    setLoadingDetail(false);
    if (res.status === 200) {
      setDetail(res.data);
    } else {
      setDetail(null);
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Load detail failed",
        })
      );
    }
  };

  const openSignDialog = async (row) => {
    setSignTarget(row);
    setUseSavedSignature(false);
    setSignError("");
    setSignOpen(true);

    // load chữ ký đã lưu (nếu có)
    setLoadingSignature(true);
    const res = await getMySignatureSampleApi();
    setLoadingSignature(false);
    if (res.status === 200 && res.data) setSavedSignature(res.data);
    else setSavedSignature(null);
  };

  const handleConfirmSign = async () => {
    if (!signTarget) return;

    // Xác định nhánh ký theo rule BE:
    // - MANAGER ký khi HĐ đang PENDING
    // - Bất kỳ role: nếu là chính chủ và status SIGNED_BY_MANAGER => ký nhánh EMPLOYEE
    let signerRole = null;
    if (account?.role === "MANAGER" && signTarget.status === "PENDING") {
      signerRole = "MANAGER";
    } else if (
      signTarget.status === "SIGNED_BY_MANAGER" &&
      signTarget.employeeId === account?.employee?.id
    ) {
      signerRole = "EMPLOYEE";
    } else {
      setSignError("Bạn không đủ điều kiện để ký hợp đồng này.");
      return;
    }

    // build signature content
    let signatureBase64 = null;
    if (useSavedSignature && savedSignature) {
      signatureBase64 = savedSignature;
    } else {
      if (!signaturePad || signaturePad.isEmpty()) {
        setSignError("Bạn phải ký tên trước khi xác nhận!");
        return;
      }
      signatureBase64 = signaturePad.toDataURL(); // base64 PNG
    }

    setSigning(true);
    const res = await signContractApi({
      contractId: signTarget.id,
      signerRole,
      signature: signatureBase64,
    });
    setSigning(false);

    if (res.status !== 200) {
      dispatch(
        setPopup({ type: "error", message: res.message || "Ký thất bại" })
      );
      return;
    }
    dispatch(setPopup({ type: "success", message: res.message || "Đã ký" }));
    setSignOpen(false);
    loadData();
  };

  // Quy tắc hiển thị nút ký
  const canSign = (row) => {
    const role = account?.role;
    if (!role) return false;

    // MANAGER ký trước khi chuyển trạng thái
    if (role === "MANAGER" && row.status === "PENDING") return true;

    // Bất kỳ role: nếu là chính chủ và đã có chữ ký Manager
    if (row.status === "SIGNED_BY_MANAGER" && row.employeeId === account?.employee?.id) {
      return true;
    }
    return false;
  };

  // Chỉ HR mới có thể thêm/sửa/xoá (khớp BE)
  const isHR = account?.role === "HR";
  const canEdit = (row) => isHR && ["PENDING", "EXPIRED"].includes(row.status);
  const canDelete = (row) => isHR && row.status === "PENDING";

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    const res = await fetchContractListApi({ page }); // BE hiện chưa phân trang
    setLoading(false);

    if (res.status === 200) {
      const data = res.data;
      const items = Array.isArray(data) ? data : data?.items ?? [];
      setRows(items);
      setPageCount(Array.isArray(data) ? 1 : data?.totalPages ?? 1);
    } else {
      setRows([]);
      setPageCount(1);
      dispatch(
        setPopup({ type: "error", message: res.message || "Load list failed" })
      );
    }
  };

  const loadEmployees = async () => {
    const res = await fetchEmployeeListApi();
    if (res.status === 200) {
      setEmployees(res.data || []);
    } else {
      setEmployees([]);
    }
  };

  const loadAccount = async () => {
    const res = await fetchAccountDataApi();
    if (res.status === 200) {
      setAccount(res.data);
    } else {
      setAccount(null);
    }
  };

  // Export contract to Word
  const handleExport = async (row) => {
    const res = await exportContractWordApi(row.id);
    if (res.status !== 200) {
      dispatch(setPopup({ type: "error", message: "Xuất Word thất bại" }));
      return;
    }

    // Lấy tên file từ Content-Disposition (nếu có), fallback theo mã HĐ
    let filename = `hop-dong-${row.contractCode || row.id}.docx`;
    const cd =
      res.headers?.["content-disposition"] ||
      res.headers?.["Content-Disposition"];
    if (cd) {
      const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
      if (m) filename = decodeURIComponent(m[1] || m[2]);
    }

    // Tải file
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    dispatch(setPopup({ type: "success", message: "Đã xuất Word" }));
  };

  // Tên đầy đủ + role cho dropdown
  const employeeName = (e) =>
    e?.fullName ||
    e?.name ||
    [e?.firstName, e?.lastName].filter(Boolean).join(" ").trim() ||
    `#${e?.id}`;
  const pickRawRole = (e) => {
    const candidates = [
      e?.employeeRole,
      e?.role,
      e?.accountRole,
      e?.account?.role,
      e?.position?.role,
      e?.title,
    ];
    const arrays = [e?.roles, e?.account?.roles, e?.authorities, e?.account?.authorities];
    for (const r of candidates) {
      if (!r) continue;
      if (typeof r === "string") return r;
      if (typeof r?.name === "string") return r.name;
    }
    for (const arr of arrays) {
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const f = arr[0];
      if (typeof f === "string") return f;
      if (typeof f?.name === "string") return f.name;
    }
    return "";
  };
  const roleLabel = (r) => {
    let s = String(r || "").trim();
    if (s.startsWith("ROLE_")) s = s.slice(5);
    return s.replace(/_/g, " ").toUpperCase();
  };
  const employeeLabel = (e) => {
    const name = employeeName(e);
    const role = roleLabel(pickRawRole(e));
    return role ? `${name} – ${role}` : name;
  };

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [page]);

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" fontWeight={700}>
            Quản lý hợp đồng lao động
          </Typography>
          {account?.role === "HR" && ( // chỉ HR được tạo
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAdd}
              sx={{ borderRadius: 2 }}
            >
              Thêm hợp đồng
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 0 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã HĐ</TableCell>
              <TableCell>Nhân viên</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Lương cơ bản</TableCell>
              <TableCell>Ngày bắt đầu</TableCell>
              <TableCell>Ngày kết thúc</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="center" width={280}>
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.contractCode}</TableCell>
                  <TableCell>
                    {row.employeeRole
                      ? `${row.employeeName} – ${row.employeeRole}`
                      : row.employeeName}
                  </TableCell>
                  <TableCell>{typeLabel(row.type)}</TableCell>
                  <TableCell>
                    {row.basicSalary != null
                      ? row.basicSalary.toLocaleString()
                      : ""}
                  </TableCell>
                  <TableCell>{row.startDate}</TableCell>
                  <TableCell>{row.endDate}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.status}
                      color={statusColor(row.status)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Xem chi tiết">
                      <IconButton onClick={() => handleView(row.id)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xuất Word">
                      <IconButton onClick={() => handleExport(row)}>
                        <Download />
                      </IconButton>
                    </Tooltip>

                    {canEdit(row) && (
                      <Tooltip title="Sửa">
                        <IconButton
                          color="secondary"
                          onClick={() => handleEdit(row.id)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    )}

                    {canDelete(row) && (
                      <Tooltip title="Xóa">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    )}

                    {/* Nút ký theo rule mới */}
                    {canSign(row) && (
                      <Tooltip title="Ký hợp đồng">
                        <IconButton
                          color="primary"
                          onClick={() => openSignDialog(row)}
                        >
                          <BorderColor />
                        </IconButton>
                      </Tooltip>
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
          />
        </Box>
      </Paper>

      {/* Create / Edit Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{formMode === "add" ? "Tạo hợp đồng" : "Cập nhật hợp đồng"}</DialogTitle>
        <DialogContent dividers>
          <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
            <Controller
              name="contractCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Mã hợp đồng"
                  placeholder="NEX-2025-0001"
                  fullWidth
                  margin="normal"
                  error={!!errors.contractCode}
                  helperText={errors.contractCode?.message || "Định dạng: NEX-YYYY-SSSS"}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              )}
            />

            <FormControl fullWidth margin="normal" error={!!errors.employeeId}>
              <InputLabel>Nhân viên</InputLabel>
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Nhân viên">
                    <MenuItem value="">
                      <em>-- Chọn nhân viên --</em>
                    </MenuItem>
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {employeeLabel(e)}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.employeeId?.message}</FormHelperText>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Ngày bắt đầu"
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.startDate}
                    helperText={errors.startDate?.message}
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                )}
              />

              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label="Ngày kết thúc"
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.endDate}
                    helperText={errors.endDate?.message}
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                )}
              />
            </Stack>

            <FormControl fullWidth margin="normal" error={!!errors.type}>
              <InputLabel>Loại hợp đồng</InputLabel>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Loại hợp đồng">
                    <MenuItem value="">
                      <em>-- Chọn loại --</em>
                    </MenuItem>
                    <MenuItem value="PERMANENT">Chính thức</MenuItem>
                    <MenuItem value="PROBATION">Thử việc (≤ 64 ngày)</MenuItem>
                    <MenuItem value="TEMPORARY">Thời vụ (≤ 12 tháng)</MenuItem>
                  </Select>
                )}
              />
              <FormHelperText>{errors.type?.message}</FormHelperText>
            </FormControl>

            <Controller
              name="basicSalary"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Lương cơ bản"
                  fullWidth
                  margin="normal"
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  error={!!errors.basicSalary}
                  helperText={errors.basicSalary?.message}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              )}
            />

            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Ghi chú"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                  error={!!errors.note}
                  helperText={errors.note?.message}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Đóng</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>
            {formMode === "add" ? "Tạo" : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết hợp đồng</DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={26} />
            </Stack>
          ) : !detail ? (
            <Typography align="center" color="text.secondary">
              Không có dữ liệu
            </Typography>
          ) : (
            <Stack spacing={1}>
              <Typography><b>Mã HĐ:</b> {detail.contractCode}</Typography>
              <Typography><b>Nhân viên:</b> {detail.employeeName || detail.employeeId}</Typography>
              <Typography><b>Loại:</b> {typeLabel(detail.type)}</Typography>
              <Typography><b>Lương cơ bản:</b> {detail.basicSalary?.toLocaleString?.() || detail.basicSalary}</Typography>
              <Typography><b>Ngày bắt đầu:</b> {detail.startDate}</Typography>
              <Typography><b>Ngày kết thúc:</b> {detail.endDate}</Typography>
              <Typography><b>Trạng thái:</b> {detail.status}</Typography>
              {detail.note && <Typography><b>Ghi chú:</b> {detail.note}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Sign Dialog */}
      <Dialog open={signOpen} onClose={() => setSignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ký hợp đồng</DialogTitle>
        <DialogContent dividers>
          {loadingSignature ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={26} />
            </Stack>
          ) : (
            <>
              <Stack direction="row" spacing={2} mb={1}>
                <Button
                  variant={useSavedSignature ? "contained" : "outlined"}
                  onClick={() => setUseSavedSignature(true)}
                >
                  Dùng chữ ký đã lưu
                </Button>
                <Button
                  variant={!useSavedSignature ? "contained" : "outlined"}
                  onClick={() => setUseSavedSignature(false)}
                >
                  Ký trực tiếp
                </Button>
              </Stack>

              {useSavedSignature ? (
                savedSignature ? (
                  <Box
                    sx={{
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                      textAlign: "center",
                    }}
                  >
                    <img
                      src={savedSignature}
                      alt="signature"
                      style={{ maxWidth: "100%", maxHeight: 200 }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    Bạn chưa có chữ ký đã lưu. Hãy ký trực tiếp để lưu dùng lần sau.
                  </Typography>
                )
              ) : (
                <SignatureCanvas
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    style: { border: "1px solid #ccc", borderRadius: 8, width: "100%" },
                  }}
                  ref={(ref) => setSignaturePad(ref)}
                />
              )}

              {signError && (
                <Typography color="error" mt={1}>
                  {signError}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignOpen(false)} disabled={signing}>
            Hủy
          </Button>
          <Button variant="contained" onClick={handleConfirmSign} disabled={signing}>
            {signing ? "Đang ký..." : "Xác nhận ký"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
