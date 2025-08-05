import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  IconButton,
  Menu,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  getLeaveRequestsApi,
  approveLeaveRequestApi,
  rejectLeaveRequestApi,
  createLeaveRequestApi,
  exportLeaveRequestWordApi,
  getMyPendingSentApi,
  getPendingToApproveApi,
  getBusyLeaveDaysApi,
  getLeaveBalanceApi,
  getMySignatureSampleApi,
  saveMySignatureSampleApi,
} from "~/services/leave.service";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { fetchAccountDataApi } from "~/services/auth.service";
import { getAccountsByRolesApi } from "~/services/account.service";
import SignatureCanvas from "react-signature-canvas";
import DatePicker from "react-multi-date-picker";
import "react-multi-date-picker/styles/colors/green.css";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

const schema = yup.object().shape({
  reason: yup.string().required("Lý do không được bỏ trống"),

  receiverId: yup
    .number()
    .typeError("Phải chọn người duyệt")
    .required("Phải chọn người duyệt"),

  // Validate cho chế độ RANGE
  startDate: yup.string().when("leaveMode", {
    is: "RANGE",
    then: (schema) => schema.required("Ngày bắt đầu không được bỏ trống"),
    otherwise: (schema) => schema.notRequired(),
  }),

  endDate: yup.string().when("leaveMode", {
    is: "RANGE",
    then: (schema) =>
      schema
        .required("Ngày kết thúc không được bỏ trống")
        .test(
          "is-after",
          "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
          function (value) {
            const { startDate } = this.parent;
            if (!startDate || !value) return true;
            return value >= startDate;
          }
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  // Validate cho chế độ MULTI (ngắt quãng)
  days: yup.array().when("leaveMode", {
    is: "MULTI",
    then: (schema) =>
      schema
        .min(1, "Bạn phải chọn ít nhất 1 ngày nghỉ!")
        .typeError("Bạn phải chọn ít nhất 1 ngày nghỉ!"),
    otherwise: (schema) => schema.notRequired(),
  }),

  // Nếu muốn validate thêm cho nghỉ theo giờ thì bổ sung thêm startTime, endTime ở đây
});

// Helper functions lấy ngày/tháng/năm từ chuỗi ISO
const getDay = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.getDate();
};
const getMonth = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.getMonth() + 1;
};
const getYear = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.getFullYear();
};
const formatDate = (str) => {
  if (!str) return "";
  const [year, month, day] = str.split("-");
  return `${day}/${month}/${year}`;
};
const formatDateTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}  ${hour}:${min}`;
};

export default function LeaveRequest() {
  const { t } = useTranslation("leave_page");
  const dispatch = useDispatch();

  const [savedSignature, setSavedSignature] = useState(null); // base64 string
  const [useSavedSignature, setUseSavedSignature] = useState(false);
  const [loadingSignature, setLoadingSignature] = useState(false);

  const [leaveMode, setLeaveMode] = useState("RANGE");
  const [leaveType, setLeaveType] = useState("FULL_DAY");
  const [multiDays, setMultiDays] = useState([]);
  const [multiDaysInput, setMultiDaysInput] = useState("");
  const [apiError, setApiError] = useState("");

  const [busyDays, setBusyDays] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [hodError, setHodError] = useState("");

  const [leaveBalance, setLeaveBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // Dialog xem trước đơn nghỉ phép
  const [previewData, setPreviewData] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);

  // Các state quản lý khác (giữ nguyên)
  const [showPendingToApprove, setShowPendingToApprove] = useState(false);
  const [showMyPendingSent, setShowMyPendingSent] = useState(false);
  const [pendingToApprove, setPendingToApprove] = useState([]);
  const [myPendingSent, setMyPendingSent] = useState([]);
  const [openReasonDialog, setOpenReasonDialog] = useState(false);
  const [fullReason, setFullReason] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuRowId, setMenuRowId] = useState(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [currentApproveId, setCurrentApproveId] = useState(null);
  const [signaturePad, setSignaturePad] = useState(null);
  const [signError, setSignError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiverList, setReceiverList] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [leaveData, setLeaveData] = useState({
    items: [],
    totalPages: 1,
    totalElements: 0,
    currentPage: 1,
  });
  const [account, setAccount] = useState(null);

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      reason: "",
      receiverId: null,
      startDate: "",
      endDate: "",
      days: [],
      leaveMode: "RANGE", // hoặc "MULTI" tùy chế độ ban đầu
    },
  });

  // Gọi API lấy danh sách ngày bận khi biết departmentId và month
  const fetchBusyDays = async (departmentId, month) => {
    if (!departmentId || !month) return;
    const res = await getBusyLeaveDaysApi(departmentId, month);
    if (res.status === 200 && Array.isArray(res.data)) {
      setBusyDays(res.data);
    } else setBusyDays([]);
  };

  const getCurrentMonth = () => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // yyyy-MM
  };

  const fetchLeaveBalance = async (month) => {
    setBalanceLoading(true);
    const res = await getLeaveBalanceApi(month || getCurrentMonth());
    setBalanceLoading(false);
    if (res.status === 200) {
      setLeaveBalance(res.data);
    } else {
      setLeaveBalance(null);
    }
  };

  // Click cả dòng TableRow để xem trước
  const handleRowClick = (row) => {
    setPreviewData(row);
    setOpenPreview(true);
  };

  const handleMenuOpen = (event, rowId) => {
    setAnchorEl(event.currentTarget);
    setMenuRowId(rowId);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRowId(null);
  };

  // Nhận biết vai trò
  const isEmployee = account?.role === "EMPLOYEE";
  const isManager = account?.role === "MANAGER";
  const isAdmin = account?.role === "ADMIN";
  const isPM = account?.role === "PM";

  // Các hàm fetch API
  const fetchLeaveRequests = async (params = {}) => {
    setLoading(true);
    const res = await getLeaveRequestsApi({ ...params, size });
    setLoading(false);
    if (res.status !== 200) {
      dispatch(setPopup({ type: "error", message: res.message }));
      return;
    }
    setLeaveData(res.data);
  };

  const fetchAccountAndReceivers = async () => {
    const res = await fetchAccountDataApi();
    if (res.status === 200) {
      setAccount(res.data);

      if (res.data.role === "EMPLOYEE") {
        // Lấy đúng HOD phòng ban của employee
        const department = res.data.employee?.department;
        if (department && department.hod) {
          setReceiverList([
            {
              id: department.hod.id,
              fullName: department.hod.fullName,
              role: department.hod.role,
            },
          ]);
          setHodError("");
        } else {
          setReceiverList([]);
          setHodError(
            "Bạn chưa thuộc phòng ban nào hoặc phòng chưa có trưởng phòng (HOD), không thể gửi đơn!"
          );
        }
      } else {
        // Các role khác như cũ
        let roles = [];
        if (res.data.role === "HOD" || res.data.role === "PM")
          roles = ["MANAGER"];
        if (roles.length > 0) {
          const receiverRes = await getAccountsByRolesApi(roles);
          setReceiverList(receiverRes.status === 200 ? receiverRes.data : []);
        } else setReceiverList([]);
        setHodError(""); // reset lỗi
      }
    }
  };

  const handleSignAndApprove = async () => {
    if (!signaturePad || signaturePad.isEmpty()) {
      setSignError("Bạn phải ký tên trước khi xác nhận!");
      return;
    }
    setLoading(true);
    const signatureDataUrl = signaturePad.toDataURL();
    const res = await approveLeaveRequestApi(
      currentApproveId,
      signatureDataUrl
    );
    setLoading(false);
    setSignDialogOpen(false);
    setCurrentApproveId(null);
    if (res.status !== 200)
      dispatch(setPopup({ type: "error", message: res.message }));
    else {
      dispatch(setPopup({ type: "success", message: res.message }));
      fetchLeaveRequests({ status, page });
    }
  };
  useEffect(() => {
    fetchLeaveRequests({ status, page });
  }, [status, page]);
  useEffect(() => {
    if (account?.role === "HOD" || account?.role === "MANAGER") {
      getPendingToApproveApi().then((res) => {
        if (res.status === 200 && Array.isArray(res.data))
          setPendingToApprove(res.data);
      });
    }
    if (["EMPLOYEE", "HOD", "PM"].includes(account?.role)) {
      getMyPendingSentApi().then((res) => {
        if (res.status === 200 && Array.isArray(res.data))
          setMyPendingSent(res.data);
      });
    }
  }, [account]);
  useEffect(() => {
    fetchAccountAndReceivers();
  }, []);

  const handleChangeStatus = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };
  const handleChangePage = (e, value) => {
    setPage(value);
  };
  const handleApprove = (id) => {
    setCurrentApproveId(id);
    setSignDialogOpen(true);
    setSignError("");
    fetchLeaveRequests({ status, page });
  };
  const handleReject = async (id, reason) => {
    setRejectLoading(true);
    const res = await rejectLeaveRequestApi(id, reason);
    setRejectLoading(false);
    setRejectDialogOpen(false);
    setRejectReason("");
    setRejectTargetId(null);

    if (res.status !== 200) {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Từ chối đơn thất bại!",
        })
      );
    } else {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "Đã từ chối đơn nghỉ phép!",
        })
      );
      fetchLeaveRequests({ status, page });
    }
  };

  const handleOpenDialog = () => {
    reset({
      reason: "",
      receiverId: null,
      startDate: "",
      endDate: "",
      days: [],
      leaveMode: "RANGE",
    });
    setLeaveMode("RANGE");
    setDialogOpen(true);
    // Gọi API leave-balance cho tháng hiện tại (khi mở dialog)
    fetchLeaveBalance(getCurrentMonth());

    // Lấy tháng hiện tại theo yyyy-MM
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    setSelectedMonth(month);

    // Lấy departmentId từ account
    const departmentId = account?.employee?.department?.id;
    if (departmentId) fetchBusyDays(departmentId, month);
  };
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  const onSubmit = async (formData) => {
    console.log("onSubmit formData:", formData);
    setApiError("");
    setLoading(true);

    // Tạo DTO gửi lên backend
    let dto = {
      reason: formData.reason,
      receiverId: formData.receiverId,
      leaveType: leaveType,
    };

    if (leaveMode === "RANGE") {
      // Kiểu nghỉ liên tục (start - end)
      dto.startDate = formData.startDate;
      dto.endDate = formData.endDate;
      // Xóa đảm bảo không có field days
      delete dto.days;
    } else if (leaveMode === "MULTI") {
      // Kiểu nghỉ ngắt quãng (nhiều ngày)
      dto.days = multiDays.map((d) =>
        typeof d === "string"
          ? d
          : d.format
          ? d.format("YYYY-MM-DD")
          : `${d.year}-${String(d.month).padStart(2, "0")}-${String(
              d.day
            ).padStart(2, "0")}`
      );
      // Xóa đảm bảo không có field startDate, endDate
      delete dto.startDate;
      delete dto.endDate;
    }

    // Nếu nghỉ theo giờ phải có startTime, endTime
    if (leaveType === "CUSTOM_HOURS") {
      dto.startTime = formData.startTime;
      dto.endTime = formData.endTime;
    } else {
      // Không gửi startTime/endTime nếu không phải CUSTOM_HOURS
      delete dto.startTime;
      delete dto.endTime;
    }

    // Log kiểm tra DTO gửi lên (giúp debug)
    console.log("Tạo đơn nghỉ phép DTO gửi lên:", dto);

    // Gửi API
    const res = await createLeaveRequestApi(dto);
    setLoading(false);

    if (res.status !== 201) {
      setApiError(res.message || "Tạo đơn nghỉ phép thất bại!");
      dispatch(setPopup({ type: "error", message: res.message }));
    } else {
      dispatch(setPopup({ type: "success", message: res.message }));
      setDialogOpen(false);
      fetchLeaveRequests({ status, page: 1 });
      setPage(1);
    }
  };

  const handleExportWord = async (id) => {
    try {
      setLoading(true);
      const blob = await exportLeaveRequestWordApi(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `leaveRequest_${id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      dispatch(setPopup({ type: "error", message: "Tải file thất bại!" }));
    }
  };

  //Gọi API lấy chữ ký mẫu khi mở dialog
  useEffect(() => {
    if (signDialogOpen) {
      setLoadingSignature(true);
      getMySignatureSampleApi().then((res) => {
        setLoadingSignature(false);
        if (res.status === 200 && res.data?.signatureBase64) {
          setSavedSignature(res.data.signatureBase64);
        } else {
          setSavedSignature(null);
        }
        setUseSavedSignature(false); // reset checkbox mỗi lần mở
      });
    }
  }, [signDialogOpen]);

  function getBusyDaysInRange(busyDays, startDate, endDate, threshold = 2) {
    if (!startDate || !endDate) return [];
    const busy = [];
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10); // yyyy-MM-dd
      const found = busyDays.find(
        (b) => b.date === dateStr && b.count >= threshold
      );
      if (found) {
        const [y, m, day] = found.date.split("-");
        busy.push({
          date: `${day}/${m}/${y}`,
          count: found.count,
        });
      }
    }
    return busy;
  }

  function getLeaveTimeDetail(data) {
    if (!data) return "-";
    const formatDate = (str) => {
      if (!str) return "";
      const [y, m, d] = str.split("-");
      return `${d}/${m}/${y}`;
    };
    const formatTime = (t) => (t ? t.slice(0, 5) : "");
    // Nếu nghỉ ngắt quãng (daysOff)
    if (
      data.leaveType === "FULL_DAY" &&
      Array.isArray(data.daysOff) &&
      data.daysOff.length > 0
    ) {
      // VD: "Các ngày: 01/08/2025, 03/08/2025"
      return "Các ngày: " + data.daysOff.map(formatDate).join(", ");
    }
    // FULL_DAY liên tục (startDate–endDate)
    if (data.leaveType === "FULL_DAY" && data.startDate && data.endDate) {
      if (data.startDate === data.endDate) {
        return `Ngày ${formatDate(data.startDate)} (cả ngày)`;
      } else {
        return `Từ ngày ${formatDate(data.startDate)} đến hết ngày ${formatDate(
          data.endDate
        )}`;
      }
    }
    // Nửa ngày sáng/chiều
    if (
      data.leaveType === "HALF_DAY_MORNING" ||
      data.leaveType === "HALF_DAY_AFTERNOON"
    ) {
      const timeRange =
        data.leaveType === "HALF_DAY_MORNING"
          ? "8:00 - 12:00"
          : "13:00 - 17:00";
      return `Ngày ${formatDate(data.startDate)} (${timeRange})`;
    }
    // Nghỉ theo giờ
    if (data.leaveType === "CUSTOM_HOURS" && data.startTime && data.endTime) {
      return `Ngày ${formatDate(data.startDate)} (${formatTime(
        data.startTime
      )} - ${formatTime(data.endTime)})`;
    }
    return "-";
  }

  return (
    <>
      <title>{t("Leave Requests")}</title>
      <Box sx={{ width: "100%", maxWidth: 2000, mx: "auto", mt: 4, px: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t("Leave Requests")}
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t("Status")}</InputLabel>
              <Select
                value={status}
                label={t("Status")}
                onChange={handleChangeStatus}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {t(opt.label)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Ẩn nút tạo đơn cho MANAGER và ADMIN */}
            {!isManager && !isAdmin && (
              <Button
                variant="contained"
                onClick={handleOpenDialog}
                sx={{ whiteSpace: "nowrap" }}
              >
                {t("Create Leave Request")}
              </Button>
            )}
          </Box>
        </Box>

        {/* Đơn bạn đã gửi chờ duyệt */}
        {["EMPLOYEE", "HOD", "PM"].includes(account?.role) &&
          myPendingSent.length > 0 && (
            <Stack sx={{ mb: 2, width: "100%" }}>
              <Alert
                icon={<TaskAltIcon fontSize="inherit" />}
                severity="info"
                action={
                  <Button
                    color="primary"
                    size="small"
                    variant={showMyPendingSent ? "outlined" : "contained"}
                    onClick={() => {
                      if (!showMyPendingSent) {
                        setLeaveData({
                          items: myPendingSent,
                          totalPages: 1,
                          totalElements: myPendingSent.length,
                          currentPage: 1,
                        });
                        setShowMyPendingSent(true);
                        setShowPendingToApprove(false);
                      } else {
                        setShowMyPendingSent(false);
                        fetchLeaveRequests({ status, page });
                      }
                    }}
                  >
                    {showMyPendingSent
                      ? "Bỏ lọc"
                      : `Xem đơn (${myPendingSent.length})`}
                  </Button>
                }
                sx={{
                  fontWeight: 500,
                  bgcolor: "#e3f2fd",
                  color: "#1976d2",
                  border: "1px solid #90caf9",
                  borderRadius: 2,
                  alignItems: "center",
                }}
              >
                Bạn có <b>{myPendingSent.length}</b> đơn{" "}
                <span style={{ color: "#ff9800" }}>chờ được duyệt</span>
              </Alert>
            </Stack>
          )}

        {/* Đơn bạn cần duyệt */}
        {(account?.role === "HOD" || account?.role === "MANAGER") &&
          pendingToApprove.length > 0 && (
            <Stack sx={{ mb: 2, width: "100%" }}>
              <Alert
                icon={<TaskAltIcon fontSize="inherit" />}
                severity="info"
                action={
                  <Button
                    color="primary"
                    size="small"
                    variant={showPendingToApprove ? "outlined" : "contained"}
                    onClick={() => {
                      if (!showPendingToApprove) {
                        setLeaveData({
                          items: pendingToApprove,
                          totalPages: 1,
                          totalElements: pendingToApprove.length,
                          currentPage: 1,
                        });
                        setShowPendingToApprove(true);
                        setShowMyPendingSent(false);
                      } else {
                        setShowPendingToApprove(false);
                        fetchLeaveRequests({ status, page });
                      }
                    }}
                  >
                    {showPendingToApprove
                      ? "Bỏ lọc"
                      : `Xem đơn (${pendingToApprove.length})`}
                  </Button>
                }
                sx={{
                  fontWeight: 500,
                  bgcolor: "#e3f2fd",
                  color: "#1976d2",
                  border: "1px solid #90caf9",
                  borderRadius: 2,
                  alignItems: "center",
                }}
              >
                Bạn có <b>{pendingToApprove.length}</b> đơn{" "}
                <span style={{ color: "#ff9800" }}>chờ bạn duyệt</span>
              </Alert>
            </Stack>
          )}

        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#4caf50" }}>
                <TableCell>#</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell>Loại đơn</TableCell>
                <TableCell>Chi tiết ngày nghỉ</TableCell>
                <TableCell>Lý do</TableCell>
                <TableCell>Người gửi</TableCell>
                <TableCell>Người duyệt</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : leaveData.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Không có đơn nghỉ phép nào
                  </TableCell>
                </TableRow>
              ) : (
                leaveData.items.map((row, idx) => {
                  const formatDate = (str) => {
                    if (!str) return "";
                    const [y, m, d] = str.split("-");
                    return `${d}/${m}/${y}`;
                  };
                  const formatDateTime = (isoString) => {
                    if (!isoString) return "";
                    const date = new Date(isoString);
                    const day = String(date.getDate()).padStart(2, "0");
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const year = date.getFullYear();
                    const hour = String(date.getHours()).padStart(2, "0");
                    const min = String(date.getMinutes()).padStart(2, "0");
                    return `${day}/${month}/${year} ${hour}:${min}`;
                  };

                  // 1. Xác định loại đơn:
                  let typeLabel = "-";
                  if (row.leaveType) {
                    if (row.leaveType === "FULL_DAY") {
                      if (
                        row.daysOff &&
                        Array.isArray(row.daysOff) &&
                        row.daysOff.length > 0
                      ) {
                        typeLabel = "Nghỉ ngắt quãng";
                      } else if (
                        row.startDate &&
                        row.endDate &&
                        row.startDate === row.endDate
                      ) {
                        typeLabel = "Nghỉ 1 ngày";
                      } else {
                        typeLabel = "Nghỉ liên tục";
                      }
                    } else if (row.leaveType === "HALF_DAY_MORNING") {
                      typeLabel = "Nửa ngày sáng";
                    } else if (row.leaveType === "HALF_DAY_AFTERNOON") {
                      typeLabel = "Nửa ngày chiều";
                    } else if (row.leaveType === "CUSTOM_HOURS") {
                      typeLabel = "Nghỉ theo giờ";
                    } else {
                      typeLabel = row.leaveType;
                    }
                  }

                  // 2. Chi tiết ngày nghỉ:
                  let detail = "-";
                  if (
                    row.leaveType === "FULL_DAY" &&
                    row.daysOff &&
                    Array.isArray(row.daysOff) &&
                    row.daysOff.length > 0
                  ) {
                    // Nghỉ ngắt quãng
                    detail = row.daysOff
                      .map((d) => (typeof d === "string" ? formatDate(d) : d))
                      .join(", ");
                  } else if (
                    row.leaveType === "FULL_DAY" &&
                    row.startDate &&
                    row.endDate &&
                    row.startDate === row.endDate
                  ) {
                    // Nghỉ 1 ngày
                    detail = formatDate(row.startDate);
                  } else if (
                    row.leaveType === "FULL_DAY" &&
                    row.startDate &&
                    row.endDate
                  ) {
                    // Nghỉ liên tục
                    detail = `${formatDate(row.startDate)} - ${formatDate(
                      row.endDate
                    )}`;
                  } else if (
                    row.leaveType === "HALF_DAY_MORNING" ||
                    row.leaveType === "HALF_DAY_AFTERNOON"
                  ) {
                    // Nửa ngày
                    let timeRange =
                      row.leaveType === "HALF_DAY_MORNING"
                        ? "8:00 - 12:00"
                        : "13:00 - 17:00";
                    detail = `${formatDate(row.startDate)} - (${timeRange})`;
                  } else if (row.leaveType === "CUSTOM_HOURS") {
                    // Nghỉ theo giờ
                    if (row.startTime && row.endTime) {
                      detail = `${formatDate(
                        row.startDate
                      )} - (${row.startTime.slice(0, 5)} - ${row.endTime.slice(
                        0,
                        5
                      )})`;
                    } else {
                      detail = formatDate(row.startDate);
                    }
                  }

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      style={{ cursor: "pointer" }}
                      onClick={() => handleRowClick(row)}
                    >
                      <TableCell>
                        {(leaveData.currentPage - 1) * size + idx + 1}
                      </TableCell>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>{typeLabel}</TableCell>
                      <TableCell>{detail}</TableCell>
                      <TableCell>
                        {row.reason?.length > 50 ? (
                          <>
                            {row.reason.slice(0, 50) + "... "}
                            <Button
                              size="small"
                              sx={{ minWidth: 0, p: 0, textTransform: "none" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullReason(row.reason);
                                setOpenReasonDialog(true);
                              }}
                            >
                              Xem thêm
                            </Button>
                          </>
                        ) : (
                          row.reason
                        )}
                      </TableCell>
                      <TableCell>
                        {row.sender?.fullName} <br />
                        <Typography
                          component="span"
                          color="text.secondary"
                          fontSize={12}
                        >
                          {row.sender?.role}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.receiver?.fullName} <br />
                        <Typography
                          component="span"
                          color="text.secondary"
                          fontSize={12}
                        >
                          {row.receiver?.role}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t(row.status)}
                          color={
                            row.status === "APPROVED"
                              ? "success"
                              : row.status === "REJECTED"
                              ? "error"
                              : row.status === "PENDING"
                              ? "warning"
                              : "default"
                          }
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, row.id);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl}
                          open={menuRowId === row.id}
                          onClose={handleMenuClose}
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                          }}
                          transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                          }}
                        >
                          <MenuItem
                            onClick={() => {
                              handleExportWord(row.id);
                              handleMenuClose();
                            }}
                          >
                            {t("Export Word")}
                          </MenuItem>
                          {!isEmployee &&
                            !isAdmin &&
                            !isPM &&
                            row.status === "PENDING" &&
                            !(
                              account.role === "HOD" &&
                              row.sender?.role === "HOD"
                            ) && [
                              <MenuItem
                                key="approve"
                                onClick={() => {
                                  handleApprove(row.id);
                                  handleMenuClose();
                                }}
                                sx={{ color: "green" }}
                              >
                                {t("Approve")}
                              </MenuItem>,
                              <MenuItem
                                key="reject"
                                onClick={() => {
                                  setRejectTargetId(row.id);
                                  setRejectDialogOpen(true);
                                  setRejectReason("");
                                  setRejectError("");
                                  handleMenuClose();
                                }}
                                sx={{ color: "red" }}
                              >
                                {t("Reject")}
                              </MenuItem>,
                            ]}
                        </Menu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Pagination
            count={leaveData.totalPages || 1}
            page={leaveData.currentPage || 1}
            onChange={handleChangePage}
            color="primary"
            size="medium"
          />
        </Box>
      </Box>
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("Create Leave Request")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pb: 1 }}>
            {/* --- Thông báo phép còn lại --- */}
            {balanceLoading ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Đang kiểm tra số ngày phép còn lại...
              </Alert>
            ) : (
              leaveBalance && (
                <>
                  {leaveBalance.leaveLeftInMonth <= 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      Bạn đã hết ngày phép trong tháng này! (Tối đa 1
                      ngày/tháng)
                    </Alert>
                  )}
                  {leaveBalance.leaveLeftInYear < 3 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      Bạn chỉ còn <b>{leaveBalance.leaveLeftInYear}</b> ngày
                      phép trong năm. Hãy cân nhắc trước khi gửi đơn.
                    </Alert>
                  )}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Đã dùng <b>{leaveBalance.leaveUsedInYear}</b>/
                    <b>{leaveBalance.limitPerYear}</b> ngày phép năm,&nbsp;
                    <b>{leaveBalance.leaveUsedInMonth}</b>/
                    <b>{leaveBalance.limitPerMonth}</b> ngày phép tháng này.
                  </Alert>
                </>
              )
            )}
            {process.env.NODE_ENV === "development" && (
              <pre style={{ fontSize: 10, color: "#f00" }}>
                {JSON.stringify(errors, null, 2)}
              </pre>
            )}

            {/* -- Chọn kiểu nghỉ: liên tục hay ngắt quãng -- */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Kiểu nghỉ phép</InputLabel>
              <Select
                value={leaveMode}
                label="Kiểu nghỉ phép"
                onChange={(e) => {
                  setLeaveMode(e.target.value);
                  setValue("leaveMode", e.target.value); // BẮT BUỘC PHẢI CÓ
                  setValue("days", []); // reset luôn cho chắc
                  setMultiDays([]);
                }}
                disabled={loading}
              >
                <MenuItem value="RANGE">Nghỉ liên tục (start-end)</MenuItem>
                <MenuItem value="MULTI">
                  Nghỉ ngắt quãng (nhiều ngày rời rạc)
                </MenuItem>
              </Select>
            </FormControl>

            {/* -- Chọn loại nghỉ phép -- */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Loại nghỉ phép</InputLabel>
              <Select
                value={leaveType}
                label="Loại nghỉ phép"
                onChange={(e) => setLeaveType(e.target.value)}
                disabled={loading || leaveMode === "MULTI"}
              >
                <MenuItem value="FULL_DAY">Nghỉ cả ngày</MenuItem>
                <MenuItem value="HALF_DAY_MORNING">
                  Nửa ngày sáng (8:00-12:00)
                </MenuItem>
                <MenuItem value="HALF_DAY_AFTERNOON">
                  Nửa ngày chiều (13:00-17:00)
                </MenuItem>
                <MenuItem value="CUSTOM_HOURS">Nghỉ theo giờ</MenuItem>
              </Select>
            </FormControl>

            {/* -- Lý do -- */}
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Lý do"
                  margin="normal"
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={8}
                  inputProps={{ maxLength: 800 }}
                  error={!!errors.reason}
                  helperText={errors.reason?.message}
                  disabled={loading}
                />
              )}
            />

            {/* -- Chọn ngày nghỉ -- */}
            {leaveMode === "RANGE" && (
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Từ ngày"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      disabled={loading}
                      onChange={(e) => {
                        field.onChange(e);
                        setSelectedStart(e.target.value);
                      }}
                    />
                  )}
                />
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Đến ngày"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      disabled={loading}
                      onChange={(e) => {
                        field.onChange(e);
                        setSelectedEnd(e.target.value);
                      }}
                    />
                  )}
                />
              </Stack>
            )}
            {/* -- Cảnh báo ngày bận cho RANGE -- */}
            {leaveMode === "RANGE" &&
              selectedStart &&
              selectedEnd &&
              getBusyDaysInRange(busyDays, selectedStart, selectedEnd, 2)
                .length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {getBusyDaysInRange(
                    busyDays,
                    selectedStart,
                    selectedEnd,
                    2
                  ).map((item, idx) => (
                    <div key={idx}>
                      Ngày <b>{item.date}</b> trong phòng ban của bạn đã có{" "}
                      <b>{item.count}</b> người nghỉ. Hãy cân nhắc trước khi tạo
                      đơn!
                    </div>
                  ))}
                </Alert>
              )}

            {leaveMode === "MULTI" && (
              <Box mt={2} sx={{ mb: 2 }}>
                <Typography fontWeight={600} mb={1}>
                  Chọn các ngày nghỉ
                </Typography>
                <DatePicker
                  multiple
                  value={multiDays}
                  onChange={(val) => {
                    setMultiDays(val);
                    setValue(
                      "days",
                      Array.isArray(val)
                        ? val.map((d) =>
                            typeof d === "string"
                              ? d
                              : d.format
                              ? d.format("YYYY-MM-DD")
                              : `${d.year}-${String(d.month).padStart(
                                  2,
                                  "0"
                                )}-${String(d.day).padStart(2, "0")}`
                          )
                        : []
                    );
                  }}
                  format="YYYY-MM-DD"
                  locale="vi"
                  className="green"
                  style={{ width: "100%" }}
                />
                {multiDays.length > 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Đã chọn:{" "}
                    {multiDays
                      .map((d) =>
                        typeof d === "string" ? d : d.format?.("DD/MM/YYYY")
                      )
                      .join(", ")}
                  </Alert>
                )}
                {/* -- Cảnh báo ngày bận cho MULTI -- */}
                {multiDays
                  .map((d) =>
                    typeof d === "string"
                      ? d
                      : d.format
                      ? d.format("YYYY-MM-DD")
                      : `${d.year}-${String(d.month).padStart(2, "0")}-${String(
                          d.day
                        ).padStart(2, "0")}`
                  )
                  .map((dateStr) => {
                    const found = busyDays.find(
                      (b) => b.date === dateStr && b.count >= 2
                    );
                    if (found) {
                      const [y, m, day] = found.date.split("-");
                      return (
                        <Alert severity="warning" sx={{ my: 1 }} key={dateStr}>
                          Ngày <b>{`${day}/${m}/${y}`}</b> trong phòng ban của
                          bạn đã có <b>{found.count}</b> người nghỉ. Hãy cân
                          nhắc trước khi tạo đơn!
                        </Alert>
                      );
                    }
                    return null;
                  })}
              </Box>
            )}

            {/* -- Nhập giờ nếu là nghỉ theo giờ -- */}
            {leaveType === "CUSTOM_HOURS" && (
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Controller
                  name="startTime"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Giờ bắt đầu"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      disabled={loading}
                    />
                  )}
                />
                <Controller
                  name="endTime"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Giờ kết thúc"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      disabled={loading}
                    />
                  )}
                />
              </Stack>
            )}

            {/* -- Người duyệt -- */}
            <Controller
              name="receiverId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal" error={!!hodError}>
                  <InputLabel>{t("Receiver")}</InputLabel>
                  <Select
                    {...field}
                    label={t("Receiver")}
                    disabled={
                      loading || receiverList.length === 0 || !!hodError
                    }
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const val =
                        e.target.value === "" ? null : Number(e.target.value);
                      field.onChange(val);
                    }}
                  >
                    {receiverList.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                  {(errors.receiverId || hodError) && (
                    <Typography color="error" variant="caption">
                      {errors.receiverId?.message || hodError}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
            {apiError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {apiError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !!hodError || receiverList.length === 0}
            >
              {loading ? <CircularProgress size={20} /> : t("Submit")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog ký tên xác nhận */}
      <Dialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Ký tên xác nhận</DialogTitle>
        <DialogContent>
          {loadingSignature ? (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <CircularProgress size={28} />
              <Typography fontSize={14} mt={1}>
                Đang kiểm tra chữ ký mẫu...
              </Typography>
            </Box>
          ) : (
            <>
              {/* Nếu có chữ ký cũ, cho chọn dùng lại */}
              {savedSignature && (
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px dashed #888",
                    borderRadius: 2,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <input
                      type="checkbox"
                      checked={useSavedSignature}
                      onChange={() => setUseSavedSignature((v) => !v)}
                      id="useSavedSignature"
                      style={{ transform: "scale(1.2)" }}
                    />
                    <label
                      htmlFor="useSavedSignature"
                      style={{ cursor: "pointer" }}
                    >
                      Dùng chữ ký đã lưu trước đó
                    </label>
                    <img
                      src={savedSignature}
                      alt="Chữ ký đã lưu"
                      style={{
                        height: 48,
                        border: "1px solid #bbb",
                        borderRadius: 6,
                        marginLeft: 16,
                        background: "#fff",
                      }}
                    />
                  </Stack>
                </Box>
              )}

              {/* Nếu không chọn chữ ký cũ thì hiển thị vùng ký mới */}
              {!useSavedSignature && (
                <SignatureCanvas
                  penColor="black"
                  canvasProps={{
                    width: 350,
                    height: 120,
                    className: "sigCanvas",
                  }}
                  ref={setSignaturePad}
                  backgroundColor="#fff"
                />
              )}
              {/* Nút xoá vùng ký mới */}
              {!useSavedSignature && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Button onClick={() => signaturePad && signaturePad.clear()}>
                    Xóa
                  </Button>
                  <Typography color="error" variant="caption">
                    {signError}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignDialogOpen(false)} color="secondary">
            Hủy
          </Button>
          <Button
            onClick={async () => {
              if (useSavedSignature && savedSignature) {
                setLoading(true);
                const res = await approveLeaveRequestApi(
                  currentApproveId,
                  savedSignature
                );
                setLoading(false);
                setSignDialogOpen(false);
                setCurrentApproveId(null);
                if (res.status !== 200)
                  dispatch(setPopup({ type: "error", message: res.message }));
                else {
                  dispatch(setPopup({ type: "success", message: res.message }));
                  fetchLeaveRequests({ status, page });
                }
              } else {
                // Xác nhận bằng chữ ký mới (giữ logic cũ)
                if (!signaturePad || signaturePad.isEmpty()) {
                  setSignError("Bạn phải ký tên trước khi xác nhận!");
                  return;
                }
                setLoading(true);
                const signatureDataUrl = signaturePad.toDataURL();
                const res = await approveLeaveRequestApi(
                  currentApproveId,
                  signatureDataUrl
                );
                setLoading(false);
                setSignDialogOpen(false);
                setCurrentApproveId(null);
                if (res.status !== 200)
                  dispatch(setPopup({ type: "error", message: res.message }));
                else {
                  dispatch(setPopup({ type: "success", message: res.message }));
                  fetchLeaveRequests({ status, page });
                }
              }
            }}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Xác nhận"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG XEM TRƯỚC ĐƠN NGHỈ PHÉP */}
      <Dialog
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 22, pb: 0 }}>
          Xem trước Đơn nghỉ phép
        </DialogTitle>
        <DialogContent sx={{ px: 6, py: 4 }}>
          <div
            style={{
              fontFamily: "Times New Roman, serif",
              color: "#222",
              minHeight: 600,
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontWeight: "bold",
                fontSize: 20,
                marginBottom: 6,
              }}
            >
              |CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM <br />
              <span style={{ fontWeight: "normal", fontSize: 16 }}>
                Độc Lập – Tự Do – Hạnh Phúc
              </span>
            </div>
            <div
              style={{
                textAlign: "center",
                fontWeight: 700,
                fontSize: 22,
                margin: "32px 0 20px 0",
              }}
            >
              ĐƠN XIN NGHỈ PHÉP
            </div>
            <div style={{ fontSize: 16, marginBottom: 20 }}>
              <span style={{ fontWeight: "bold" }}>Kính gửi:</span>
              {" - Ban Giám Đốc Công ty TNHH NEX VIETNAM"}
              <br />
              <span style={{ marginLeft: 74 }}>
                - {previewData?.receiver?.fullName} (
                {previewData?.receiver?.role})
              </span>
              <br />
              <span style={{ fontWeight: "bold" }}>Tôi tên là:</span>{" "}
              {previewData?.sender?.fullName}
              <br />
              <span style={{ fontWeight: "bold" }}>Chức vụ:</span>{" "}
              {previewData?.sender?.role}
              <br />
              <span style={{ fontWeight: "bold" }}>Số điện thoại:</span>{" "}
              {previewData?.sender?.phone}
              <br />
              <span style={{ fontWeight: "bold" }}>Email:</span>{" "}
              {previewData?.sender?.email}
            </div>
            <div style={{ fontSize: 16, margin: "18px 0" }}>
              Nay tôi làm đơn này kính xin ban lãnh đạo công ty cho tôi được
              nghỉ phép trong thời gian:
              <br />
              <span style={{ fontWeight: 700 }}>
                {getLeaveTimeDetail(previewData)}
              </span>
            </div>

            <div style={{ fontSize: 16, margin: "12px 0" }}>
              Với lý do:{" "}
              <span style={{ fontWeight: "bold" }}>{previewData?.reason}</span>
            </div>
            <div style={{ fontSize: 16, margin: "24px 0" }}>
              Kính mong ban lãnh đạo Công ty xem xét và tạo điều kiện cho tôi
              được phép nghỉ.
              <br />
              Xin trân trọng cảm ơn!
            </div>
            <div style={{ display: "flex", marginTop: 50 }}>
              <div style={{ flex: 1 }}></div>
              <div style={{ textAlign: "center", flex: 1, fontSize: 16 }}>
                Hồ Chí Minh, ngày {getDay(previewData?.createdAt)} tháng{" "}
                {getMonth(previewData?.createdAt)} năm{" "}
                {getYear(previewData?.createdAt)}
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 28 }}>
              <div style={{ flex: 1, textAlign: "center" }}>Người làm đơn</div>
              <div style={{ flex: 1, textAlign: "center" }}>
                Người phụ trách
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 40 }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                {previewData?.sender?.fullName}
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                {previewData?.receiver?.fullName}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleExportWord(previewData?.id);
            }}
            variant="contained"
            color="success"
          >
            XUẤT FILE WORD
          </Button>
          <Button onClick={() => setOpenPreview(false)} color="secondary">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog từ chối đơn */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nhập lý do từ chối</DialogTitle>
        <DialogContent>
          <TextField
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            autoFocus
            disabled={rejectLoading}
            error={!!rejectError}
            helperText={rejectError}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRejectDialogOpen(false)}
            color="secondary"
            disabled={rejectLoading}
          >
            Hủy
          </Button>
          <Button
            onClick={async () => {
              if (!rejectReason.trim()) {
                setRejectError("Bạn phải nhập lý do từ chối!");
                return;
              }
              setRejectError("");
              await handleReject(rejectTargetId, rejectReason);
            }}
            color="error"
            variant="contained"
            disabled={rejectLoading}
          >
            {rejectLoading ? <CircularProgress size={18} /> : "Từ chối"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog hiện đủ lý do */}
      <Dialog
        open={openReasonDialog}
        onClose={() => setOpenReasonDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Lý do xin nghỉ phép</DialogTitle>
        <DialogContent>
          <Typography>{fullReason}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReasonDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
