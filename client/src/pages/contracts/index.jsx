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
  TableContainer,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  BorderColor,
  Download,
  HelpOutline,
  FilterList,
  Search,
  CleaningServices,
} from "@mui/icons-material";
import {
  fetchContractListApi,
  deleteContractApi,
  fetchContractDetailApi,
  createContractApi,
  updateContractApi,
  signContractApi,
  exportContractWordApi,
  importContractsExcelApi,
  submitContractApi,
  getMySignatureSampleApi,
  searchContractsApi, // //ghi chú: API search dùng start/end (overlap)
} from "~/services/contract.service";
import { fetchEmployeeListApi } from "~/services/employee.service";
import { fetchAccountDataApi } from "~/services/auth.service";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import SignatureCanvas from "react-signature-canvas";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

/* ============================ Helper: UI mapping ============================ */
// //ghi chú: Đổi màu status -> Chip color
const statusColor = (s) =>
  s === "ACTIVE"
    ? "success"
    : s === "SIGNED_BY_MANAGER"
    ? "warning"
    : s === "PENDING"
    ? "default"
    : "error";

// //ghi chú: Label loại HĐ
const typeLabel = (t) =>
  t === "PERMANENT"
    ? "Permanent"
    : t === "PROBATION"
    ? "Probation"
    : t === "TEMPORARY"
    ? "Temporary"
    : t;

/* ============================ Helper: date/format =========================== */
// //ghi chú: Lấy mốc 0h hôm nay
const today0 = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// //ghi chú: FE validation schema (text tiếng Anh để đồng bộ UI)
const schema = yup.object().shape({
  contractCode: yup
    .string()
    .trim()
    .required("Contract code is required")
    .matches(
      /^$|^NEX-\d{4}-\d{4}$/,
      "Format must be NEX-YYYY-SSSS (e.g., NEX-2025-0001)"
    ),
  employeeId: yup
    .number()
    .typeError("Please select an employee")
    .required("Please select an employee"),
  startDate: yup
    .date()
    .typeError("Select start date")
    .required("Select start date")
    .test(
      "not-too-old",
      "Start date cannot be more than 30 days in the past",
      (v) => {
        if (!v) return true;
        const sd = new Date(v);
        sd.setHours(0, 0, 0, 0);
        const today = today0();
        const earliest = new Date(today);
        earliest.setDate(earliest.getDate() - 30); // 30 ngày
        return sd.getTime() >= earliest.getTime(); // sd >= today-30d (OK cả hôm nay & tương lai)
      }
    ),
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

/* ================================ Component ================================= */
export default function ContractPage() {
  const dispatch = useDispatch();

  // //ghi chú: State: danh sách + phân trang + tài khoản
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [account, setAccount] = useState(null);

  // //ghi chú: State: bộ lọc (khớp tham số BE) — chỉ còn 2 mốc ngày
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [cType, setCType] = useState("");
  const [start, setStart] = useState(""); // yyyy-MM-dd
  const [end, setEnd] = useState(""); // yyyy-MM-dd
  const [isSearching, setIsSearching] = useState(false); // đang xem kết quả search -> ẩn paging

  // //ghi chú: Form dialog (create/edit)
  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState("add"); // "add" | "edit"
  const [selected, setSelected] = useState(null);
  const [employees, setEmployees] = useState([]);

  // //ghi chú: Detail dialog
  const [openDetail, setOpenDetail] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // //ghi chú: Sign dialog
  const [signOpen, setSignOpen] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [useSavedSignature, setUseSavedSignature] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const [loadingSignature, setLoadingSignature] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");

  // //ghi chú: Confirm dialog (xác nhận hành động nguy hiểm)
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    processing: false,
    onConfirm: /** @type {null | (() => Promise<void> | void)} */ (null),
  });

  /* ================================ RHF setup ================================ */
  // //ghi chú: React Hook Form
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
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

  /* ============================= Small utilities ============================ */
  // //ghi chú: Mở dialog confirm
  const askConfirm = ({ title = "Confirm", message, onConfirm }) =>
    setConfirm({ open: true, title, message, onConfirm, processing: false });

  // //ghi chú: Đóng dialog confirm
  const handleConfirmClose = () =>
    setConfirm((c) => (c.processing ? c : { ...c, open: false }));

  // //ghi chú: OK dialog confirm -> chạy hành động
  const handleConfirmOk = async () => {
    if (!confirm.onConfirm) return handleConfirmClose();
    setConfirm((c) => ({ ...c, processing: true }));
    try {
      await confirm.onConfirm();
    } finally {
      setConfirm({
        open: false,
        title: "",
        message: "",
        processing: false,
        onConfirm: null,
      });
    }
  };

  // //ghi chú: Chuyển Date -> YYYY-MM-DD
  const toISODate = (d) => {
    if (!d) return null;
    if (typeof d === "string") return d;
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // //ghi chú: Số ngày bao gồm 2 đầu mốc
  const inclusiveDays = (startISO, endISO) => {
    const sd = new Date(startISO);
    const ed = new Date(endISO);
    const diff = Math.floor((ed - sd) / 86400000);
    return diff + 1;
  };

  // //ghi chú: Số tháng inclusive theo rule BE
  const inclusiveMonths = (startISO, endISO) => {
    const s = new Date(startISO);
    const e = new Date(endISO);
    return (
      (e.getFullYear() - s.getFullYear()) * 12 +
      (e.getMonth() - s.getMonth()) +
      1
    );
  };

  // //ghi chú: Helper hiển thị tên nhân viên + chức danh
  const employeeName = (e) =>
    e?.fullName ||
    e?.name ||
    [e?.firstName, e?.lastName].filter(Boolean).join(" ").trim() ||
    `#${e?.id}`;

  // //ghi chú: Gợi ý lấy role thô từ nhiều nguồn khác nhau trong object
  const pickRawRole = (e) => {
    const candidates = [
      e?.employeeRole,
      e?.role,
      e?.accountRole,
      e?.account?.role,
      e?.position?.role,
      e?.title,
    ];
    const arrays = [
      e?.roles,
      e?.account?.roles,
      e?.authorities,
      e?.account?.authorities,
    ];
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

  // //ghi chú: Chuẩn hoá role -> label in hoa
  const roleLabel = (r) => {
    let s = String(r || "").trim();
    if (s.startsWith("ROLE_")) s = s.slice(5);
    return s.replace(/_/g, " ").toUpperCase();
  };

  // //ghi chú: Label hiển thị trong dropdown nhân viên
  const employeeLabel = (e) => {
    const name = employeeName(e);
    const role = roleLabel(pickRawRole(e));
    return role ? `${name} – ${role}` : name;
  };

  /* ================================ Actions ================================= */

  // //ghi chú: Search theo bộ lọc — gọi đúng BE /contracts/search với start/end
  const runSearch = async () => {
    setLoading(true);
    const params = {
      name: name || undefined,
      status: status || undefined,
      type: cType || undefined,
      start: start || undefined,
      end: end || undefined,
    };
    const res = await searchContractsApi(params);
    setLoading(false);
    if (res.status === 200) {
      const items = Array.isArray(res.data) ? res.data : [];
      setRows(items);
      setPage(1);
      setPageCount(1);
      setIsSearching(true);
    } else {
      dispatch(
        setPopup({ type: "error", message: res.message || "Search failed" })
      );
    }
  };

  // //ghi chú: Xoá filter & về mặc định (list có phân trang)
  const clearFilters = () => {
    setName("");
    setStatus("");
    setCType("");
    setStart("");
    setEnd("");
    setIsSearching(false);
    loadData(); // gọi lại list mặc định
  };

  // //ghi chú: Gửi hợp đồng: DRAFT -> PENDING
  const handleSubmitContract = (id) => {
    askConfirm({
      title: "Submit Contract",
      message:
        "Are you sure you want to submit this contract for manager signature?",
      onConfirm: async () => {
        const res = await submitContractApi(id);
        if (res.status === 200) {
          dispatch(
            setPopup({
              type: "success",
              message: res.message || "Submitted successfully",
            })
          );
          loadData();
        } else {
          dispatch(
            setPopup({ type: "error", message: res.message || "Submit failed" })
          );
        }
      },
    });
  };

  // //ghi chú: Import Excel: tạo nhiều HĐ
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = await importContractsExcelApi(file);
    if (res.status === 200) {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "Imported successfully",
        })
      );
      loadData();
    } else {
      dispatch(
        setPopup({ type: "error", message: res.message || "Import failed" })
      );
    }
  };

  // //ghi chú: Submit form tạo/cập nhật HĐ
  const onSubmit = async (formData) => {
    const payload = {
      ...formData,
      employeeId: Number(formData.employeeId || 0),
      startDate: toISODate(formData.startDate),
      endDate: toISODate(formData.endDate),
      basicSalary:
        formData.basicSalary === "" ? null : Number(formData.basicSalary),
      contractCode:
        (formData.contractCode || "").trim() === ""
          ? null
          : String(formData.contractCode).trim(),
    };

    // cho phép quá khứ nhưng không quá 30 ngày
    if (payload.startDate) {
      const sd = new Date(payload.startDate);
      sd.setHours(0, 0, 0, 0);
      const earliest = new Date(today0());
      earliest.setDate(earliest.getDate() - 30);
      if (sd.getTime() < earliest.getTime()) {
        dispatch(
          setPopup({
            type: "error",
            message: "Start date cannot be more than 30 days in the past",
          })
        );
        return;
      }
    }

    // //ghi chú: end > start (strict)
    if (payload.startDate && payload.endDate) {
      const sd = new Date(payload.startDate);
      const ed = new Date(payload.endDate);
      if (!(ed.getTime() > sd.getTime())) {
        dispatch(
          setPopup({
            type: "error",
            message: "End date must be AFTER start date",
          })
        );
        return;
      }
    }

    // //ghi chú: Ràng buộc theo loại HĐ
    if (payload.type && payload.startDate && payload.endDate) {
      if (payload.type === "PROBATION") {
        const d = inclusiveDays(payload.startDate, payload.endDate);
        if (d > 64) {
          dispatch(
            setPopup({
              type: "error",
              message: "Probation cannot exceed 64 days",
            })
          );
          return;
        }
      }
      if (payload.type === "TEMPORARY") {
        const m = inclusiveMonths(payload.startDate, payload.endDate);
        if (m > 12) {
          dispatch(
            setPopup({
              type: "error",
              message: "Temporary cannot exceed 12 months",
            })
          );
          return;
        }
      }
    }

    // //ghi chú: Lương > 0
    if (
      payload.basicSalary == null ||
      isNaN(payload.basicSalary) ||
      payload.basicSalary <= 0
    ) {
      dispatch(setPopup({ type: "error", message: "Salary must be > 0" }));
      return;
    }

    // //ghi chú: Gọi API tạo/sửa
    const res =
      formMode === "add"
        ? await createContractApi(payload)
        : await updateContractApi(selected.id, payload);

    if (res.status === 200 || res.status === 201) {
      dispatch(
        setPopup({ type: "success", message: res.message || "Success" })
      );
      setOpenForm(false);
      loadData();
    } else {
      dispatch(setPopup({ type: "error", message: res.message || "Error" }));
    }
  };

  // //ghi chú: Mở form tạo
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

  // //ghi chú: Sửa HĐ -> load detail vào form
  const handleEdit = async (id) => {
    setFormMode("edit");
    setSelected(rows.find((r) => r.id === id));
    setOpenForm(true);
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

  // //ghi chú: Xoá HĐ (chỉ HR: DRAFT/PENDING)
  const handleDelete = (id) => {
    askConfirm({
      title: "Delete Contract",
      message: "Are you sure you want to delete this contract?",
      onConfirm: async () => {
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
      },
    });
  };

  // //ghi chú: Xem chi tiết HĐ
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

  // //ghi chú: Mở dialog ký + nạp chữ ký mẫu
  const openSignDialog = async (row) => {
    setSignTarget(row);
    setUseSavedSignature(false);
    setSignError("");
    setSignOpen(true);

    setLoadingSignature(true);
    const res = await getMySignatureSampleApi();
    setLoadingSignature(false);
    if (res.status === 200 && res.data) setSavedSignature(res.data);
    else setSavedSignature(null);
  };

  // //ghi chú: Xác nhận ký -> gửi chữ ký cho BE
  const handleConfirmSign = async () => {
    if (!signTarget) return;

    // //ghi chú: Rule ký theo role
    let signerRole = null;
    if (account?.role === "MANAGER" && signTarget.status === "PENDING") {
      signerRole = "MANAGER";
    } else if (
      signTarget.status === "SIGNED_BY_MANAGER" &&
      signTarget.employeeId === account?.employee?.id
    ) {
      signerRole = "EMPLOYEE";
    } else {
      setSignError("You are not eligible to sign this contract.");
      return;
    }

    // //ghi chú: Build chữ ký base64
    let signatureBase64 = null;
    if (useSavedSignature && savedSignature) {
      signatureBase64 = savedSignature;
    } else {
      if (!signaturePad || signaturePad.isEmpty()) {
        setSignError("Please sign before confirming.");
        return;
      }
      signatureBase64 = signaturePad.toDataURL();
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
        setPopup({ type: "error", message: res.message || "Signing failed" })
      );
      return;
    }
    dispatch(setPopup({ type: "success", message: res.message || "Signed" }));
    setSignOpen(false);
    loadData();
  };

  /* ============================ Permission helpers ========================== */
  // //ghi chú: Có quyền ký?
  const canSign = (row) => {
    const role = account?.role;
    if (!role) return false;
    if (role === "MANAGER" && row.status === "PENDING") return true;
    if (
      row.status === "SIGNED_BY_MANAGER" &&
      row.employeeId === account?.employee?.id
    )
      return true;
    return false;
  };

  // //ghi chú: HR thì mới được sửa/xoá
  const isHR = account?.role === "HR";
  const canEdit = (row) =>
    isHR && ["DRAFT", "PENDING", "EXPIRED"].includes(row.status);
  const canDelete = (row) => isHR && ["DRAFT", "PENDING"].includes(row.status);

  /* ================================== Data ================================== */
  // //ghi chú: Nạp danh sách HĐ
  const loadData = async () => {
    setLoading(true);
    const res = await fetchContractListApi({ page });
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

  // //ghi chú: Nạp danh sách nhân viên cho dropdown
  const loadEmployees = async () => {
    const res = await fetchEmployeeListApi();
    if (res.status === 200) setEmployees(res.data || []);
    else setEmployees([]);
  };

  // //ghi chú: Nạp thông tin tài khoản
  const loadAccount = async () => {
    const res = await fetchAccountDataApi();
    if (res.status === 200) setAccount(res.data);
    else setAccount(null);
  };

  // //ghi chú: Export file Word
  const handleExport = async (row) => {
    const res = await exportContractWordApi(row.id);
    if (res.status !== 200) {
      dispatch(setPopup({ type: "error", message: "Export Word failed" }));
      return;
    }

    // //ghi chú: Lấy tên file từ header nếu có
    let filename = `contract-${row.contractCode || row.id}.docx`;
    const cd =
      res.headers?.["content-disposition"] ||
      res.headers?.["Content-Disposition"];
    if (cd) {
      const m = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd);
      if (m) filename = decodeURIComponent(m[1] || m[2]);
    }

    // //ghi chú: Tải file
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

    dispatch(setPopup({ type: "success", message: "Exported" }));
  };

  /* ================================ Effects ================================= */
  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    if (!isSearching) loadData(); // //ghi chú: nếu đang xem kết quả search thì không gọi list phân trang
    loadEmployees();
  }, [page, isSearching]);

  /* ================================= Render ================================= */
  return (
    <Box sx={{ p: 2, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 2.5,
          borderRadius: 3,
          background:
            "linear-gradient(180deg, rgba(250,250,250,1) 0%, rgba(245,246,248,1) 100%)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Employment Contracts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create, track and manage employee contracts
            </Typography>
          </Box>

          {/* //ghi chú: Chỉ HR được tạo hợp đồng */}
          {account?.role === "HR" && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openAdd}
              sx={{ borderRadius: 2, px: 2.5 }}
            >
              New Contract
            </Button>
          )}
        </Stack>
      </Paper>

      {/* =============================== Filters =============================== */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
          <FilterList fontSize="small" />
          <Typography fontWeight={700}>Filters</Typography>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Employee name (contains)"
            placeholder="Enter name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
          />

          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DRAFT">DRAFT</MenuItem>
              <MenuItem value="PENDING">PENDING</MenuItem>
              <MenuItem value="SIGNED_BY_MANAGER">SIGNED_BY_MANAGER</MenuItem>
              <MenuItem value="ACTIVE">ACTIVE</MenuItem>
              <MenuItem value="EXPIRED">EXPIRED</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={cType}
              label="Type"
              onChange={(e) => setCType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PERMANENT">PERMANENT</MenuItem>
              <MenuItem value="PROBATION">PROBATION</MenuItem>
              <MenuItem value="TEMPORARY">TEMPORARY</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* //ghi chú: chỉ còn 2 ô ngày Start/End, lọc theo overlap */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mt: 2 }}
        >
          <TextField
            label="Start"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="End"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            size="small"
            fullWidth
          />
        </Stack>

        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{ mt: 2 }}
        >
          <Button
            variant="outlined"
            startIcon={<CleaningServices />}
            onClick={clearFilters}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={runSearch}
          >
            Search
          </Button>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 3 }}
        variant="outlined"
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, bgcolor: "primary.light" } }}
            >
              <TableCell width={160}>Contract No.</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell width={150}>Type</TableCell>
              <TableCell width={160}>Base Salary</TableCell>
              <TableCell width={150}>Start Date</TableCell>
              <TableCell width={150}>End Date</TableCell>
              <TableCell align="center" width={140}>
                Status
              </TableCell>
              <TableCell align="center" width={280}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1.5}
                    justifyContent="center"
                    py={2}
                  >
                    <CircularProgress size={22} />
                    <Typography variant="body2" color="text.secondary">
                      Loading contracts...
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ py: 2 }}
                  >
                    No data
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    "&:nth-of-type(odd)": { bgcolor: "rgba(0,0,0,0.02)" }, // row zebra nhẹ
                    "& td": { borderColor: "rgba(0,0,0,0.06)" },
                  }}
                >
                  <TableCell>
                    <Typography fontWeight={600}>{row.contractCode}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography>{row.employeeName}</Typography>
                    {row.employeeRole && (
                      <Typography variant="caption" color="text.secondary">
                        {row.employeeRole}
                      </Typography>
                    )}
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
                      sx={{ fontWeight: 700, borderRadius: 1 }}
                      variant="filled"
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Stack
                      direction="row"
                      justifyContent="center"
                      spacing={0.5}
                    >
                      {/* View detail */}
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={() => handleView(row.id)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Export Word */}
                      <Tooltip title="Export Word">
                        <IconButton
                          size="small"
                          onClick={() => handleExport(row)}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* HR: Edit (DRAFT, PENDING, EXPIRED) */}
                      {canEdit(row) && (
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleEdit(row.id)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* HR: Delete (DRAFT, PENDING) */}
                      {canDelete(row) && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(row.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* HR: Submit (DRAFT -> PENDING) */}
                      {isHR && row.status === "DRAFT" && (
                        <Tooltip title="Submit for signature">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSubmitContract(row.id)}
                          >
                            <BorderColor fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Sign (Manager or Employee) */}
                      {canSign(row) && (
                        <Tooltip title="Sign contract">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openSignDialog(row)}
                          >
                            <BorderColor fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Divider />

        {/* Pagination */}
        {!isSearching && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              py: 1.5,
              pr: 1.5,
            }}
          >
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="medium"
              siblingCount={1}
              boundaryCount={1}
            />
          </Box>
        )}
      </TableContainer>

      {/* ============================= Create / Edit ============================ */}
      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {formMode === "add" ? "Create Contract" : "Update Contract"}
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {/* //ghi chú: Nút import Excel */}
          <Button
            variant="outlined"
            component="label"
            sx={{ borderRadius: 2, mb: 1 }}
          >
            Import Excel
            <input
              type="file"
              hidden
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
            />
          </Button>

          {/* Contract Code */}
          <Controller
            name="contractCode"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Contract Code"
                placeholder="NEX-2025-0001"
                fullWidth
                margin="normal"
                error={!!errors.contractCode}
                helperText={
                  errors.contractCode?.message || "Format: NEX-YYYY-SSSS"
                }
                InputProps={{ sx: { borderRadius: 2 } }}
              />
            )}
          />

          {/* Employee */}
          <FormControl fullWidth margin="normal" error={!!errors.employeeId}>
            <InputLabel>Employee</InputLabel>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Employee"
                  MenuProps={{ PaperProps: { elevation: 2 } }}
                >
                  <MenuItem value="">
                    <em>— Select employee —</em>
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

          {/* Dates */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  label="Start Date"
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
                  label="End Date"
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

          {/* Type */}
          <FormControl fullWidth margin="normal" error={!!errors.type}>
            <InputLabel>Contract Type</InputLabel>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select {...field} label="Contract Type">
                  <MenuItem value="">
                    <em>— Select type —</em>
                  </MenuItem>
                  <MenuItem value="PERMANENT">Permanent</MenuItem>
                  <MenuItem value="PROBATION">Probation (≤ 64 days)</MenuItem>
                  <MenuItem value="TEMPORARY">Temporary (≤ 12 months)</MenuItem>
                </Select>
              )}
            />
            <FormHelperText>{errors.type?.message}</FormHelperText>
          </FormControl>

          {/* Salary */}
          <Controller
            name="basicSalary"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Base Salary"
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

          {/* Note */}
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notes"
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>
            {formMode === "add" ? "Create" : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================== Detail =============================== */}
      <Dialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Contract Details</DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={26} />
            </Stack>
          ) : !detail ? (
            <Typography align="center" color="text.secondary">
              No data
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              <Typography>
                <b>Contract No.:</b> {detail.contractCode}
              </Typography>
              <Typography>
                <b>Employee:</b> {detail.employeeName || detail.employeeId}
              </Typography>
              <Typography>
                <b>Type:</b> {typeLabel(detail.type)}
              </Typography>
              <Typography>
                <b>Base Salary:</b>{" "}
                {detail.basicSalary?.toLocaleString?.() || detail.basicSalary}
              </Typography>
              <Typography>
                <b>Start Date:</b> {detail.startDate}
              </Typography>
              <Typography>
                <b>End Date:</b> {detail.endDate}
              </Typography>
              <Typography>
                <b>Status:</b> {detail.status}
              </Typography>
              {detail.note && (
                <Typography>
                  <b>Notes:</b> {detail.note}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* =============================== Sign ================================ */}
      <Dialog
        open={signOpen}
        onClose={() => setSignOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Sign Contract</DialogTitle>
        <DialogContent dividers>
          {loadingSignature ? (
            <Stack alignItems="center" py={3} gap={1}>
              <CircularProgress size={26} />
              <Typography variant="body2" color="text.secondary">
                Checking saved signature...
              </Typography>
            </Stack>
          ) : (
            <>
              {/* //ghi chú: Switch giữa chữ ký đã lưu và ký trực tiếp */}
              <Stack direction="row" spacing={1.5} mb={1}>
                <Button
                  variant={useSavedSignature ? "contained" : "outlined"}
                  onClick={() => setUseSavedSignature(true)}
                >
                  Use saved signature
                </Button>
                <Button
                  variant={!useSavedSignature ? "contained" : "outlined"}
                  onClick={() => setUseSavedSignature(false)}
                >
                  Sign in canvas
                </Button>
              </Stack>

              {/* //ghi chú: Ảnh chữ ký đã lưu */}
              {useSavedSignature ? (
                savedSignature ? (
                  <Box
                    sx={{
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                      textAlign: "center",
                      bgcolor: "#fff",
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
                    No saved signature found. Please sign in canvas and it will
                    be saved for later use.
                  </Typography>
                )
              ) : (
                <SignatureCanvas
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    style: {
                      border: "1px solid #ccc",
                      borderRadius: 8,
                      width: "100%",
                    },
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
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmSign}
            disabled={signing}
          >
            {signing ? "Signing..." : "Confirm signature"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============================== Confirm =============================== */}
      <Dialog
        open={confirm.open}
        onClose={handleConfirmClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontWeight: 700,
          }}
        >
          <HelpOutline fontSize="small" />
          {confirm.title || "Confirm"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography>{confirm.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose} disabled={confirm.processing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmOk}
            disabled={confirm.processing}
          >
            {confirm.processing ? "Processing..." : "OK"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
