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
  Tooltip,
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
  getPendingHrApi,
  hrConfirmLeaveRequestApi,
  hrRejectLeaveRequestApi,
  requestCancelLeaveApi,
  hrCancelLeaveRequestApi,
} from "~/services/leave.service";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
import DatePanel from "react-multi-date-picker/plugins/date_panel";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "PENDING_HR", label: "Chờ HR" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "WAITING_TO_CANCEL", label: "Đợi Hủy Đơn" },
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

// Convert DateObject | string -> 'YYYY-MM-DD' (dùng chung toàn file)
const toISO = (d) =>
  typeof d === "string" ? d : d?.format?.("YYYY-MM-DD") || "";

// ==== Month-end reminder helpers (hoisted) ====
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function daysLeftInMonth() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.floor(
    (startOfDay(last) - startOfDay(now)) / (1000 * 60 * 60 * 24)
  );
}
function isWithinLastTwoDaysOfMonth() {
  const left = daysLeftInMonth();
  return left >= 0 && left <= 21;
}
function isCreatedThisMonth(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}
function humanDaysLeftText() {
  const left = daysLeftInMonth();
  if (left === 0) return "Hôm nay là ngày cuối tháng";
  if (left === 1) return "Còn 1 ngày là hết tháng";
  if (left === 2) return "Còn 2 ngày là hết tháng";
  return "";
}

export default function LeaveRequest() {
  const { t } = useTranslation("leave_page");
  const dispatch = useDispatch();

  const [pendingHr, setPendingHr] = useState([]);
  const [showPendingHr, setShowPendingHr] = useState(false);

  // HR cancel
  const [hrCancelDialogOpen, setHrCancelDialogOpen] = useState(false);
  const [hrCancelTargetId, setHrCancelTargetId] = useState(null);
  const [hrCancelLoading, setHrCancelLoading] = useState(false);

  const [savedSignature, setSavedSignature] = useState(null);
  const [useSavedSignature, setUseSavedSignature] = useState(false);
  const [loadingSignature, setLoadingSignature] = useState(false);

  const [calendarValue, setCalendarValue] = useState([]); // dùng cho cả RANGE & MULTI

  // --- Filter states ---
  //const [departmentId, setDepartmentId] = useState(""); // chỉ HR mới thấy input này
  const [departmentName, setDepartmentName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // yyyy-MM-dd
  const [monthFilter, setMonthFilter] = useState(""); // yyyy-MM

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

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
  const [isHrRejectMode, setIsHrRejectMode] = useState(false);

  // Dialog xem trước đơn nghỉ phép
  const [previewData, setPreviewData] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);
  // Hành động cần thực thi sau khi xem preview
  // { type: 'export'|'approve'|'reject'|'hrConfirm'|'hrReject'|'hrCancel'|'requestCancel', id, row }
  const [pendingAction, setPendingAction] = useState(null);

  const actionLabels = {
    export: "Xuất Word",
    approve: "Duyệt",
    reject: "Từ chối",
    hrConfirm: "Xác nhận HR",
    hrReject: "Từ chối HR",
    hrCancel: "Hủy đơn (HR)",
    requestCancel: "Xin hủy đơn",
  };

  // Mở preview kèm hành động cần thực thi sau khi xem
  const openPreviewWithAction = (row, type) => {
    setPreviewData(row);
    setPendingAction({ type, id: row.id, row });
    setOpenPreview(true);
  };

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

  const doHrConfirm = async (id) => {
    setLoading(true);
    const res = await hrConfirmLeaveRequestApi(id);
    setLoading(false);
    if (res.status !== 200) {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Xác nhận HR thất bại!",
        })
      );
    } else {
      dispatch(
        setPopup({ type: "success", message: res.message || "Đã xác nhận HR" })
      );
      if (showPendingHr) {
        const r = await getPendingHrApi();
        if (r.status === 200 && Array.isArray(r.data)) {
          setPendingHr(r.data);
          setLeaveData({
            items: r.data,
            totalPages: 1,
            totalElements: r.data.length,
            currentPage: 1,
          });
        }
      } else {
        fetchLeaveRequests(buildListParams({ page }));
      }
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    const { type, id, row } = pendingAction;
    // đóng preview trước để tránh chồng dialog
    setOpenPreview(false);
    setPendingAction(null);

    switch (type) {
      case "export":
        handleExportWord(id);
        break;
      case "approve":
        handleApprove(id); // mở dialog ký
        break;
      case "reject":
        setRejectTargetId(id);
        setRejectDialogOpen(true);
        setRejectReason("");
        setRejectError("");
        setIsHrRejectMode(false);
        break;
      case "hrConfirm":
        await doHrConfirm(id);
        break;
      case "hrReject":
        setRejectTargetId(id);
        setRejectDialogOpen(true);
        setRejectReason("");
        setRejectError("");
        setIsHrRejectMode(true);
        break;
      case "hrCancel":
        setHrCancelTargetId(id);
        setHrCancelDialogOpen(true);
        break;
      case "requestCancel":
        setCancelTargetId(id);
        setCancelReason("");
        setCancelError("");
        setCancelDialogOpen(true);
        break;
      default:
        break;
    }
  };

  // build params cho list
  const buildListParams = (overrides = {}) => {
    const p = {
      status,
      page,
      ...overrides,
    };
    // HR mới được chọn phòng ban; role khác để trống (BE tự visibility)
    //if (account?.role === "HR" && departmentId) p.departmentId = departmentId;
    if (account?.role === "HR" && departmentName)
      p.departmentName = departmentName;
    if (senderName) p.senderName = senderName;
    if (dateFilter) p.date = dateFilter;
    if (monthFilter) p.month = monthFilter;
    return p;
  };

  const handleSearch = () => {
    // tắt các filter "quick views" nếu đang bật
    setShowMyPendingSent(false);
    setShowPendingToApprove(false);
    setShowPendingHr(false);
    setPage(1);
    fetchLeaveRequests(buildListParams({ page: 1 }));
  };

  const handleClearFilters = () => {
    setDepartmentName("");
    //setDepartmentId("");
    setSenderName("");
    setDateFilter("");
    setMonthFilter("");
    setPage(1);
    fetchLeaveRequests({ status: "", page: 1 }); // trở về mặc định
  };

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
  const isHR = account?.role === "HR";
  const isHOD = account?.role === "HOD";
  const isChiefAcc = account?.role === "CHIEFACCOUNTANT";
  const isAccountant = account?.role === "ACCOUNTANT";

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
    if (res.status !== 200) return;

    setAccount(res.data);

    // EMPLOYEE -> auto HOD (accountId)
    if (res.data.role === "EMPLOYEE") {
      const dept = res.data.employee?.department;
      const hodEmp = dept?.hod;
      const hodAccId = hodEmp?.account?.id;

      if (dept && hodEmp && hodAccId) {
        const fullName =
          hodEmp?.account?.fullName ||
          `${hodEmp?.firstName || ""} ${hodEmp?.lastName || ""}`.trim();

        setReceiverList([
          {
            id: hodAccId,
            fullName: fullName || "HOD",
            role: hodEmp?.account?.role || "HOD",
          },
        ]);
        setValue("receiverId", Number(hodAccId));
        setHodError("");
      } else {
        setReceiverList([]);
        setValue("receiverId", null);
        setHodError(
          "Bạn chưa thuộc phòng ban nào hoặc phòng chưa có trưởng phòng (HOD), không thể gửi đơn!"
        );
      }
      return;
    }

    // ACCOUNTANT -> CHIEFACCOUNTANT
    if (res.data.role === "ACCOUNTANT") {
      const receiverRes = await getAccountsByRolesApi(["CHIEFACCOUNTANT"]);
      setReceiverList(receiverRes.status === 200 ? receiverRes.data : []);
      setHodError("");
      return;
    }

    // HOD/PM/HR/ADMIN/SECRETARY/CHIEFACCOUNTANT -> MANAGER
    if (
      ["HOD", "PM", "HR", "ADMIN", "SECRETARY", "CHIEFACCOUNTANT"].includes(
        res.data.role
      )
    ) {
      const receiverRes = await getAccountsByRolesApi(["MANAGER"]);
      setReceiverList(receiverRes.status === 200 ? receiverRes.data : []);
      setHodError("");
      return;
    }

    // MANAGER (và còn lại) -> không có người duyệt
    setReceiverList([]);
    setValue("receiverId", null);
    setHodError("");
  };

  // Truyền params object: { useSavedSignature, savedSignatureBase64 }
  const handleSignAndApprove = async ({
    useSavedSignature,
    savedSignatureBase64,
  }) => {
    let signatureDataUrl = null;

    if (useSavedSignature && savedSignatureBase64) {
      signatureDataUrl = savedSignatureBase64;
    } else {
      // Phải kiểm tra signaturePad đã có ref và có ký chưa
      if (!signaturePad || signaturePad.isEmpty()) {
        setSignError("Bạn phải ký tên trước khi xác nhận!");
        return;
      }
      signatureDataUrl = signaturePad.toDataURL();
    }

    setLoading(true);
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
      fetchLeaveRequests(buildListParams({ page }));
    }
  };

  useEffect(() => {
    // HOD / MANAGER / CHIEFACCOUNTANT: đơn chờ bạn duyệt (PENDING)
    if (["HOD", "MANAGER", "CHIEFACCOUNTANT"].includes(account?.role)) {
      getPendingToApproveApi().then((res) => {
        if (res.status === 200 && Array.isArray(res.data))
          setPendingToApprove(res.data);
      });
    }

    // HR: đơn chờ HR confirm (PENDING_HR)
    if (account?.role === "HR") {
      getPendingHrApi().then((res) => {
        if (res.status === 200 && Array.isArray(res.data))
          setPendingHr(res.data);
      });
    }

    // Những role được gửi đơn -> show "đơn bạn đã gửi chờ duyệt"
    const senders = [
      "EMPLOYEE",
      "HOD",
      "PM",
      "HR",
      "ADMIN",
      "SECRETARY",
      "CHIEFACCOUNTANT",
      "ACCOUNTANT",
    ];
    if (senders.includes(account?.role)) {
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
    if (!showMyPendingSent && !showPendingToApprove && !showPendingHr) {
      fetchLeaveRequests(buildListParams({ page: value }));
    }
  };

  const handleApprove = (id) => {
    setCurrentApproveId(id);
    setSignDialogOpen(true);
    setSignError("");
  };
  const handleReject = async (id, reason) => {
    setRejectLoading(true);
    let res;
    if (isHrRejectMode) {
      res = await hrRejectLeaveRequestApi(id, reason);
    } else {
      res = await rejectLeaveRequestApi(id, reason);
    }
    setRejectLoading(false);
    setRejectDialogOpen(false);
    setRejectReason("");
    setRejectTargetId(null);
    setIsHrRejectMode(false);

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
          message:
            res.message ||
            (isHrRejectMode
              ? "HR đã từ chối xác nhận!"
              : "Đã từ chối đơn nghỉ phép!"),
        })
      );
      // Nếu đang xem danh sách chờ HR thì refresh lại chính danh sách đó
      if (isHrRejectMode && showPendingHr) {
        const r = await getPendingHrApi();
        if (r.status === 200 && Array.isArray(r.data)) {
          setPendingHr(r.data);
          setLeaveData({
            items: r.data,
            totalPages: 1,
            totalElements: r.data.length,
            currentPage: 1,
          });
        }
      } else {
        fetchLeaveRequests(buildListParams({ page }));
      }
    }
  };

  const handleOpenDialog = () => {
    // EMPLOYEE: tự động set HOD (accountId) để qua Yup; các role khác để null
    const hodAccId = account?.employee?.department?.hod?.account?.id;
    const defaultReceiverId =
      account?.role === "EMPLOYEE" && hodAccId ? Number(hodAccId) : null;

    reset({
      reason: "",
      receiverId: defaultReceiverId,
      startDate: "",
      endDate: "",
      days: [],
      leaveMode: "RANGE",
    });

    setLeaveMode("RANGE");
    setCalendarValue([]); // reset Calendar
    setSelectedStart("");
    setSelectedEnd("");
    setDialogOpen(true);

    // Leave balance cho tháng hiện tại
    fetchLeaveBalance(getCurrentMonth());

    // Lấy yyyy-MM hiện tại
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    setSelectedMonth(month);

    // Lấy ngày bận của phòng ban
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
      dto.days = formData.days || [];
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
        // Đúng: kiểm tra res.data (không phải res.data.signatureBase64)
        if (res.status === 200 && res.data) {
          setSavedSignature(res.data); // base64 string
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

  const canApproveRow = (row) => {
    if (row.status !== "PENDING") return false;
    if (!account?.id) return false;

    // chỉ người được chỉ định (receiver) mới thấy nút
    const isReceiver = row?.receiver?.id === account.id;
    if (!isReceiver) return false;

    const senderRole = row?.sender?.role;

    if (isManager) {
      return [
        "HOD",
        "PM",
        "HR",
        "ADMIN",
        "SECRETARY",
        "CHIEFACCOUNTANT",
      ].includes(senderRole);
    }
    if (isHOD) {
      return senderRole === "EMPLOYEE";
    }
    if (isChiefAcc) {
      return senderRole === "ACCOUNTANT";
    }
    return false;
  };

  // Chỉ HR mới được hủy; theo BE: cho hủy khi PENDING_HR hoặc APPROVED
  const canHrCancelRow = (row) => {
    return isHR && row?.status !== "CANCELLED";
  };

  // NẠP LIST theo status + page (khi không bật các filter cục bộ)
  useEffect(() => {
    if (!showMyPendingSent && !showPendingToApprove && !showPendingHr) {
      fetchLeaveRequests(buildListParams());
    }
  }, [
    status,
    page,
    showMyPendingSent,
    showPendingToApprove,
    showPendingHr,
    //departmentId,
    departmentName,
    senderName,
    dateFilter,
    monthFilter,
    account,
  ]);

  const canRequestCancel = (row) => {
    if (!account?.id) return false;
    const isOwner = row?.sender?.id === account.id; // chỉ chính chủ đơn
    if (!isOwner) return false;
    // Cho phép xin hủy khi đơn đang chờ duyệt, chờ HR, hoặc đã duyệt
    return ["PENDING", "PENDING_HR", "APPROVED"].includes(row?.status);
  };

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Bạn phải nhập lý do hủy!");
      return;
    }
    setCancelError("");
    setCancelLoading(true);
    const res = await requestCancelLeaveApi(cancelTargetId, cancelReason);
    setCancelLoading(false);
    setCancelDialogOpen(false);
    setCancelReason("");
    setCancelTargetId(null);

    if (res.status !== 200) {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Gửi yêu cầu hủy thất bại!",
        })
      );
    } else {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "Đã gửi yêu cầu hủy đơn!",
        })
      );
      // refresh list hiện tại
      if (showMyPendingSent) {
        const r = await getMyPendingSentApi();
        if (r.status === 200 && Array.isArray(r.data)) {
          setMyPendingSent(r.data);
          setLeaveData({
            items: r.data,
            totalPages: 1,
            totalElements: r.data.length,
            currentPage: 1,
          });
        }
      } else {
        fetchLeaveRequests(buildListParams({ page }));
      }
    }
  };

  const handleHrCancel = async () => {
    setHrCancelLoading(true);
    const res = await hrCancelLeaveRequestApi(hrCancelTargetId);
    setHrCancelLoading(false);
    setHrCancelDialogOpen(false);
    setHrCancelTargetId(null);

    if (res.status !== 200) {
      dispatch(
        setPopup({ type: "error", message: res.message || "Hủy đơn thất bại!" })
      );
    } else {
      dispatch(
        setPopup({ type: "success", message: res.message || "HR đã hủy đơn." })
      );
      // Nếu đang xem danh sách chờ HR thì reload danh sách đó,
      // ngược lại refresh list theo filter hiện tại
      if (showPendingHr) {
        const r = await getPendingHrApi();
        if (r.status === 200 && Array.isArray(r.data)) {
          setPendingHr(r.data);
          setLeaveData({
            items: r.data,
            totalPages: 1,
            totalElements: r.data.length,
            currentPage: 1,
          });
        }
      } else {
        fetchLeaveRequests(buildListParams({ page }));
      }
    }
  };

  // (tuỳ chọn) nạp 1 lần khi mở trang
  useEffect(() => {
    fetchLeaveRequests({ status: "", page: 1 });
  }, []);

  // --- Month-end counts (lọc theo đơn tạo trong THÁNG HIỆN TẠI) ---
  const isReminderWindow = isWithinLastTwoDaysOfMonth();
  const pendingForMeThisMonth = pendingToApprove.filter(
    (r) => r.status === "PENDING" && isCreatedThisMonth(r.createdAt)
  ).length;

  const pendingHrThisMonth = pendingHr.filter(
    (r) => r.status === "PENDING_HR" && isCreatedThisMonth(r.createdAt)
  ).length;

  const myPendingThisMonth = myPendingSent.filter(
    (r) =>
      (r.status === "PENDING" || r.status === "PENDING_HR") &&
      isCreatedThisMonth(r.createdAt)
  ).length;

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
            {/* Bộ lọc nâng cao */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(4, 1fr)",
                  lg: "repeat(5, 1fr)",
                },
                gap: 2,
                mt: 1,
                mb: 2,
              }}
            >
              {/* Chỉ HR mới thấy filter phòng ban
              {account?.role === "HR" && (
                <TextField
                  size="small"
                  label="Phòng ban (ID)"
                  value={departmentId}
                  onChange={(e) =>
                    setDepartmentId(e.target.value.replace(/\D+/g, ""))
                  }
                  placeholder="VD: 3"
                />
              )} */}
              {account?.role === "HR" && (
                <TextField
                  size="small"
                  label="Phòng ban (tên)"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="Nhập tên phòng ban..."
                />
              )}

              <TextField
                size="small"
                label="Tên người gửi / username"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Nhập từ khóa..."
              />

              <TextField
                size="small"
                type="date"
                label="Ngày nghỉ (đúng ngày)"
                InputLabelProps={{ shrink: true }}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />

              <TextField
                size="small"
                type="month"
                label="Tháng nghỉ"
                InputLabelProps={{ shrink: true }}
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />

              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="text" onClick={handleClearFilters}>
                  Xóa lọc
                </Button>
              </Stack>
            </Box>

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
            {/* Ẩn nút tạo đơn cho MANAGER */}
            {!isManager && (
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
                        fetchLeaveRequests(buildListParams({ page }));
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
        {["HOD", "MANAGER", "CHIEFACCOUNTANT"].includes(account?.role) &&
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
                        fetchLeaveRequests(buildListParams({ page }));
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

        {/* Đơn chờ HR xác nhận */}
        {isHR && pendingHr.length > 0 && (
          <Stack sx={{ mb: 2, width: "100%" }}>
            <Alert
              icon={<TaskAltIcon fontSize="inherit" />}
              severity="info"
              action={
                <Button
                  color="primary"
                  size="small"
                  variant={showPendingHr ? "outlined" : "contained"}
                  onClick={() => {
                    if (!showPendingHr) {
                      setLeaveData({
                        items: pendingHr,
                        totalPages: 1,
                        totalElements: pendingHr.length,
                        currentPage: 1,
                      });
                      setShowPendingHr(true);
                      setShowMyPendingSent(false);
                      setShowPendingToApprove(false);
                    } else {
                      setShowPendingHr(false);
                      fetchLeaveRequests(buildListParams({ page }));
                    }
                  }}
                >
                  {showPendingHr ? "Bỏ lọc" : `Xem đơn (${pendingHr.length})`}
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
              Bạn có <b>{pendingHr.length}</b> đơn{" "}
              <span style={{ color: "#ff9800" }}>chờ HR xác nhận</span>
            </Alert>
          </Stack>
        )}
        {/* ============ Nhắc Receiver (HOD / MANAGER / CHIEFACCOUNTANT) ============ */}
        {isReminderWindow &&
          ["HOD", "MANAGER", "CHIEFACCOUNTANT"].includes(account?.role) &&
          pendingForMeThisMonth > 0 && (
            <Stack sx={{ mb: 2, width: "100%" }}>
              <Alert
                severity="warning"
                action={
                  <Button
                    color="warning"
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
                        setShowPendingHr(false);
                      } else {
                        setShowPendingToApprove(false);
                        fetchLeaveRequests(buildListParams({ page }));
                      }
                    }}
                  >
                    {showPendingToApprove ? "Bỏ lọc" : "Xem danh sách"}
                  </Button>
                }
                sx={{
                  fontWeight: 500,
                  bgcolor: "#fff8e1",
                  color: "#ff6f00",
                  border: "1px solid #ffe082",
                  borderRadius: 2,
                  alignItems: "center",
                }}
              >
                {humanDaysLeftText()}. Bạn có <b>{pendingForMeThisMonth}</b> đơn
                <span style={{ color: "#ef6c00" }}> chờ bạn duyệt</span> trong
                tháng này. Vui lòng xử lý để kịp chốt tháng.
              </Alert>
            </Stack>
          )}

        {/* ============ Nhắc HR (PENDING_HR) ============ */}
        {isReminderWindow && isHR && pendingHrThisMonth > 0 && (
          <Stack sx={{ mb: 2, width: "100%" }}>
            <Alert
              severity="warning"
              action={
                <Button
                  color="warning"
                  size="small"
                  variant={showPendingHr ? "outlined" : "contained"}
                  onClick={() => {
                    if (!showPendingHr) {
                      setLeaveData({
                        items: pendingHr,
                        totalPages: 1,
                        totalElements: pendingHr.length,
                        currentPage: 1,
                      });
                      setShowPendingHr(true);
                      setShowMyPendingSent(false);
                      setShowPendingToApprove(false);
                    } else {
                      setShowPendingHr(false);
                      fetchLeaveRequests(buildListParams({ page }));
                    }
                  }}
                >
                  {showPendingHr ? "Bỏ lọc" : "Xem danh sách"}
                </Button>
              }
              sx={{
                fontWeight: 500,
                bgcolor: "#fff8e1",
                color: "#ff6f00",
                border: "1px solid #ffe082",
                borderRadius: 2,
                alignItems: "center",
              }}
            >
              {humanDaysLeftText()}. Có <b>{pendingHrThisMonth}</b> đơn
              <span style={{ color: "#ef6c00" }}> chờ HR xác nhận</span> trong
              tháng này.
            </Alert>
          </Stack>
        )}

        {/* ============ Nhắc Sender (đơn mình đã gửi còn chờ duyệt) ============ */}
        {isReminderWindow &&
          [
            "EMPLOYEE",
            "HOD",
            "PM",
            "HR",
            "ADMIN",
            "SECRETARY",
            "CHIEFACCOUNTANT",
            "ACCOUNTANT",
          ].includes(account?.role) &&
          myPendingThisMonth > 0 && (
            <Stack sx={{ mb: 2, width: "100%" }}>
              <Alert
                severity="warning"
                action={
                  <Button
                    color="warning"
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
                        setShowPendingHr(false);
                      } else {
                        setShowMyPendingSent(false);
                        fetchLeaveRequests(buildListParams({ page }));
                      }
                    }}
                  >
                    {showMyPendingSent ? "Bỏ lọc" : "Xem đơn của tôi"}
                  </Button>
                }
                sx={{
                  fontWeight: 500,
                  bgcolor: "#fff8e1",
                  color: "#ff6f00",
                  border: "1px solid #ffe082",
                  borderRadius: 2,
                  alignItems: "center",
                }}
              >
                {humanDaysLeftText()}. Bạn còn <b>{myPendingThisMonth}</b> đơn
                đã gửi
                <span style={{ color: "#ef6c00" }}>
                  {" "}
                  chưa được duyệt/xác nhận
                </span>{" "}
                trong tháng này. Vui lòng chủ động liên hệ người duyệt/HR nếu
                cần.
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
                    <TableRow key={row.id} hover>
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
                              : row.status === "PENDING_HR" // +++
                              ? "info"
                              : row.status === "PENDING"
                              ? "warning"
                              : row.status === "CANCELLED"
                              ? "default"
                              : "default"
                          }
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Xem trước">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewData(row);
                              setOpenPreview(true);
                            }}
                            sx={{ mr: 0.5 }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
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
                              openPreviewWithAction(row, "export");
                              handleMenuClose();
                            }}
                          >
                            {t("Export Word")}
                          </MenuItem>
                          {canApproveRow(row) && [
                            <MenuItem
                              key="approve"
                              onClick={() => {
                                openPreviewWithAction(row, "approve");
                                handleMenuClose();
                              }}
                              sx={{ color: "green" }}
                            >
                              {t("Approve")}
                            </MenuItem>,
                            <MenuItem
                              key="reject"
                              onClick={() => {
                                openPreviewWithAction(row, "reject");
                                handleMenuClose();
                              }}
                              sx={{ color: "red" }}
                            >
                              {t("Reject")}
                            </MenuItem>,
                          ]}
                          {isHR && row.status === "PENDING_HR" && (
                            <MenuItem
                              onClick={() => {
                                openPreviewWithAction(row, "hrConfirm");
                                handleMenuClose();
                              }}
                              sx={{ color: "green" }}
                            >
                              Xác nhận HR
                            </MenuItem>
                          )}
                          {isHR && row.status === "PENDING_HR" && (
                            <MenuItem
                              onClick={() => {
                                openPreviewWithAction(row, "hrReject");
                                handleMenuClose();
                              }}
                              sx={{ color: "red" }}
                            >
                              Từ chối HR
                            </MenuItem>
                          )}
                          {canHrCancelRow(row) && (
                            <MenuItem
                              onClick={() => {
                                openPreviewWithAction(row, "hrCancel");
                                handleMenuClose();
                              }}
                              sx={{ color: "error.main" }}
                            >
                              Hủy đơn (HR){" "}
                            </MenuItem>
                          )}
                          {canRequestCancel(row) && (
                            <MenuItem
                              onClick={() => {
                                openPreviewWithAction(row, "requestCancel");
                                handleMenuClose();
                              }}
                              sx={{ color: "warning.main" }}
                            >
                              Xin hủy đơn
                            </MenuItem>
                          )}
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
                  // reset dữ liệu liên quan khi đổi mode
                  setCalendarValue([]);
                  setSelectedStart("");
                  setSelectedEnd("");
                  setMultiDays([]);
                  setValue("days", []);
                  setValue("startDate", "");
                  setValue("endDate", "");
                  // MULTI chỉ hợp lệ với FULL_DAY
                  if (e.target.value === "MULTI") {
                    setLeaveType("FULL_DAY");
                  }
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

            {/* -- Chọn ngày nghỉ (dùng chung 1 Calendar) -- */}
            <Box mt={2} sx={{ mb: 2 }}>
              <Typography fontWeight={600} mb={1}>
                Chọn ngày nghỉ
              </Typography>

              <DatePicker
                value={calendarValue}
                onChange={(val) => {
                  setCalendarValue(val);

                  if (leaveMode === "RANGE") {
                    const [s, e] = Array.isArray(val)
                      ? val
                      : val
                      ? [val, null]
                      : [null, null];
                    const sISO = toISO(s) || "";
                    const eISO = toISO(e) || "";

                    setSelectedStart(sISO);
                    setSelectedEnd(eISO);
                    setValue("startDate", sISO);
                    setValue("endDate", eISO);
                    setValue("days", []);
                    setMultiDays([]);
                  } else {
                    const arr = Array.isArray(val) ? val : val ? [val] : [];
                    const daysISO = arr.map(toISO).filter(Boolean);

                    setMultiDays(arr);
                    setValue("days", daysISO);
                    setValue("startDate", "");
                    setValue("endDate", "");
                    setSelectedStart("");
                    setSelectedEnd("");
                  }
                }}
                range={leaveMode === "RANGE"}
                multiple={leaveMode === "MULTI"}
                locale="vi"
                format="YYYY-MM-DD"
                className="green"
                weekStartDayIndex={1} // tuần bắt đầu từ Thứ Hai
                plugins={[<DatePanel key="panel" header="Ngày đã chọn" />]}
                mapDays={({ date }) => {
                  const props = {};

                  // 1) Làm mờ & chặn chọn ngày Chủ nhật
                  if (date.weekDay.index === 0) {
                    // 0 = Chủ nhật
                    props.disabled = true; // không cho click/chọn
                    props.className = "sunday-disabled";
                    props.title = "Chủ nhật";
                  }

                  // 2) Tô nổi ngày bận (>= 2 người nghỉ)
                  try {
                    const iso = date.format("YYYY-MM-DD");
                    const found = busyDays.find(
                      (b) => b.date === iso && b.count >= 2
                    );
                    if (found) {
                      props.className = [props.className, "busy-day"]
                        .filter(Boolean)
                        .join(" ");
                      props.title =
                        (props.title ? props.title + " • " : "") +
                        `${found.count} người nghỉ`;
                    }
                  } catch {}

                  return props;
                }}
              />

              {/* Legend & CSS cho ngày bận */}
              <Typography
                variant="caption"
                sx={{ mt: 1, display: "inline-block" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    border: "1px dashed #ff9800",
                    background: "rgba(255,152,0,.15)",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                Ngày có nhiều người nghỉ trong phòng ban (≥2)
              </Typography>
              <style>
                {`
      .rmdp-day.sunday-disabled span{
  color: #9e9e9e !important;
  background: #f5f5f5 !important;
  border: 1px dashed #e0e0e0 !important;
  box-shadow: none !important;
}
  .rmdp-day.sunday-disabled span:hover{
  background: #f5f5f5 !important; /* giữ nguyên mờ khi hover */
}
    `}
              </style>

              {/* Hiển thị nhanh các ngày đã chọn (MULTI) */}
              {leaveMode === "MULTI" &&
                Array.isArray(calendarValue) &&
                calendarValue.length > 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Đã chọn:{" "}
                    {calendarValue
                      .map((d) =>
                        typeof d === "string" ? d : d.format?.("DD/MM/YYYY")
                      )
                      .join(", ")}
                  </Alert>
                )}

              {/* Cảnh báo ngày bận cho RANGE */}
              {leaveMode === "RANGE" &&
                selectedStart &&
                selectedEnd &&
                getBusyDaysInRange(busyDays, selectedStart, selectedEnd, 2)
                  .length > 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {getBusyDaysInRange(
                      busyDays,
                      selectedStart,
                      selectedEnd,
                      2
                    ).map((item, idx) => (
                      <div key={idx}>
                        Ngày <b>{item.date}</b> trong phòng ban của bạn đã có{" "}
                        <b>{item.count}</b> người nghỉ. Hãy cân nhắc trước khi
                        tạo đơn!
                      </div>
                    ))}
                  </Alert>
                )}

              {/* Cảnh báo ngày bận cho MULTI */}
              {leaveMode === "MULTI" &&
                (Array.isArray(calendarValue) ? calendarValue : []).map((d) => {
                  const iso = toISO(d);
                  const found = busyDays.find(
                    (b) => b.date === iso && b.count >= 2
                  );
                  if (!found) return null;
                  const [y, m, day] = iso.split("-");
                  return (
                    <Alert severity="warning" sx={{ mt: 1 }} key={iso}>
                      Ngày <b>{`${day}/${m}/${y}`}</b> trong phòng ban của bạn
                      đã có <b>{found.count}</b> người nghỉ. Hãy cân nhắc trước
                      khi tạo đơn!
                    </Alert>
                  );
                })}
            </Box>

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
              await handleSignAndApprove({
                useSavedSignature,
                savedSignatureBase64: savedSignature,
              });
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
        onClose={() => {
          setOpenPreview(false);
          setPendingAction(null);
        }}
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
            onClick={() => handleExportWord(previewData?.id)}
            variant="contained"
            color="success"
          >
            XUẤT FILE WORD
          </Button>
          {pendingAction && (
            <Button
              onClick={executePendingAction}
              variant="contained"
              color="primary"
            >
              {`Tiếp tục: ${actionLabels[pendingAction.type] || "Thực hiện"}`}
            </Button>
          )}
          <Button
            onClick={() => {
              setOpenPreview(false);
              setPendingAction(null);
            }}
            color="secondary"
          >
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

      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xin hủy đơn nghỉ phép</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Yêu cầu hủy sẽ gửi email cho <b>Người duyệt</b> và <b>HR</b>.
          </Alert>
          <TextField
            label="Lý do hủy"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            autoFocus
            disabled={cancelLoading}
            error={!!cancelError}
            helperText={cancelError}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            color="secondary"
            disabled={cancelLoading}
          >
            Đóng
          </Button>
          <Button
            onClick={handleCancelRequest}
            variant="contained"
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={18} /> : "Gửi yêu cầu hủy"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận HR hủy đơn */}
      <Dialog
        open={hrCancelDialogOpen}
        onClose={() => setHrCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xác nhận hủy đơn</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Thao tác này sẽ <b>hủy đơn nghỉ phép</b> và gửi email cho người nộp
            đơn.
          </Alert>
          <Typography>Bạn có chắc muốn hủy đơn này?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setHrCancelDialogOpen(false)}
            color="secondary"
            disabled={hrCancelLoading}
          >
            Đóng
          </Button>
          <Button
            onClick={handleHrCancel}
            variant="contained"
            color="error"
            disabled={hrCancelLoading}
          >
            {hrCancelLoading ? <CircularProgress size={18} /> : "Hủy đơn"}
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
