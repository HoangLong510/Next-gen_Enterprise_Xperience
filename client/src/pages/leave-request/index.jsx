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
  Divider,
} from "@mui/material";
import {
  Check as CheckIcon,
  Close as CloseIcon,
  FilterAlt as FilterAltIcon,
  ClearAll as ClearAllIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
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
  getPendingHrApi,
  hrConfirmLeaveRequestApi,
  hrRejectLeaveRequestApi,
  requestCancelLeaveApi,
  hrCancelLeaveRequestApi,
  getMyExpiredCountApi,
} from "~/services/leave.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { fetchAccountDataApi } from "~/services/auth.service";
import { getAccountsByRolesApi } from "~/services/account.service";
import SignatureCanvas from "react-signature-canvas";
import DatePicker from "react-multi-date-picker";
import "react-multi-date-picker/styles/colors/green.css";
import DatePanel from "react-multi-date-picker/plugins/date_panel";

// ================================================
// VI: HẰNG SỐ – cấu hình status + nhãn
// ================================================
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PENDING_HR", label: "Waiting HR" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WAITING_TO_CANCEL", label: "Waiting To Cancel" },
  { value: "EXPIRED", label: "Expired" },
];

// VI: map status -> màu Chip của MUI
const statusColor = (s) => {
  switch (s) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    case "PENDING_HR":
      return "info";
    case "PENDING":
      return "warning";
    case "CANCELLED":
      return "default";
    case "EXPIRED":
      return "secondary";
    default:
      return "default";
  }
};

// ================================================
// VI: VALIDATION – yup schema (giữ nguyên rule, đổi message sang tiếng Anh)
// ================================================
const schema = yup.object().shape({
  reason: yup.string().required("Reason is required"),
  receiverId: yup
    .number()
    .typeError("Please select an approver")
    .required("Please select an approver"),

  // VI: Range mode
  startDate: yup.string().when("leaveMode", {
    is: "RANGE",
    then: (s) => s.required("Start date is required"),
    otherwise: (s) => s.notRequired(),
  }),

  endDate: yup.string().when("leaveMode", {
    is: "RANGE",
    then: (schema) =>
      schema
        .required("End date is required")
        .test(
          "is-after",
          "End date must be the same as or after start date",
          function (value) {
            const { startDate } = this.parent;
            if (!startDate || !value) return true;
            return value >= startDate;
          }
        ),
    otherwise: (schema) => schema.notRequired(),
  }),

  // VI: Multi mode
  days: yup.array().when("leaveMode", {
    is: "MULTI",
    then: (s) =>
      s.min(1, "Please pick at least 1 day!").typeError("Please pick days!"),
    otherwise: (s) => s.notRequired(),
  }),
});

// ================================================
// VI: Helpers thời gian + format chuỗi ngày/giờ
// ================================================
const getDay = (iso) => (iso ? new Date(iso).getDate() : "");
const getMonth = (iso) => (iso ? new Date(iso).getMonth() + 1 : "");
const getYear = (iso) => (iso ? new Date(iso).getFullYear() : "");
const formatDate = (str) => {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};
const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${min}`;
};
const toISO = (d) =>
  typeof d === "string" ? d : d?.format?.("YYYY-MM-DD") || "";

// ================================================
// VI: Helpers cuối tháng – dùng cho banner nhắc xử lý
// ================================================
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
  return left >= 0 && left <= 2;
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
  if (left === 0) return "Today is the last day of the month";
  if (left === 1) return "1 day left in this month";
  if (left === 2) return "2 days left in this month";
  return "";
}

// ================================================
// VI: COMPONENT CHÍNH
// ================================================
export default function LeaveRequest() {
  const dispatch = useDispatch();

  // ---------- VI: State dữ liệu & giao diện ----------
  const [pendingHr, setPendingHr] = useState([]);
  const [showPendingHr, setShowPendingHr] = useState(false);

  const [myExpiredCount, setMyExpiredCount] = useState(0); // VI: đếm đơn hết hạn tháng trước (theo role)

  // HR cancel
  const [hrCancelDialogOpen, setHrCancelDialogOpen] = useState(false);
  const [hrCancelTargetId, setHrCancelTargetId] = useState(null);
  const [hrCancelLoading, setHrCancelLoading] = useState(false);

  const [savedSignature, setSavedSignature] = useState(null);
  const [useSavedSignature, setUseSavedSignature] = useState(false);
  const [loadingSignature, setLoadingSignature] = useState(false);

  const [calendarValue, setCalendarValue] = useState([]); // VI: dùng chung RANGE & MULTI

  // Filters
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
  const [multiDays, setMultiDays] = useState([]); // VI: lưu UI hiển thị – giữ để không đổi hành vi
  const [apiError, setApiError] = useState("");

  const [busyDays, setBusyDays] = useState([]);
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

  // Preview
  const [previewData, setPreviewData] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // VI: hành động tiếp theo sau preview

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

  // ---------- VI: Role helpers ----------
  const isEmployee = account?.role === "EMPLOYEE";
  const isManager = account?.role === "MANAGER";
  const isAdmin = account?.role === "ADMIN";
  const isPM = account?.role === "PM";
  const isHR = account?.role === "HR";
  const isHOD = account?.role === "HOD";
  const isChiefAcc = account?.role === "CHIEFACCOUNTANT";
  const isAccountant = account?.role === "ACCOUNTANT";

  // VI: user có quyền duyệt?
  const isApprover = useMemo(
    () => ["HOD", "MANAGER", "CHIEFACCOUNTANT"].includes(account?.role),
    [account]
  );

  // ================================================
  // VI: API – danh sách, pending, v.v.
  // ================================================
  const buildListParams = (overrides = {}) => {
    const p = { status, page, ...overrides };
    if (account?.role === "HR" && departmentName)
      p.departmentName = departmentName;
    if (senderName) p.senderName = senderName;
    if (dateFilter) p.date = dateFilter;
    if (monthFilter) p.month = monthFilter;
    return p;
  };

  // VI: fetch list chính
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

  // VI: load bận trong phòng ban theo tháng (để highlight trong calendar)
  const fetchBusyDays = async (departmentId, month) => {
    if (!departmentId || !month) return;
    const res = await getBusyLeaveDaysApi(departmentId, month);
    if (res.status === 200 && Array.isArray(res.data)) setBusyDays(res.data);
    else setBusyDays([]);
  };

  // VI: số ngày phép còn lại
  const fetchLeaveBalance = async (month) => {
    setBalanceLoading(true);
    const res = await getLeaveBalanceApi(month);
    setBalanceLoading(false);
    setLeaveBalance(res.status === 200 ? res.data : null);
  };

  // VI: load account + danh sách người duyệt thích hợp theo role
  const fetchAccountAndReceivers = async () => {
    const res = await fetchAccountDataApi();
    if (res.status !== 200) return;

    setAccount(res.data);

    if (res.data.role === "EMPLOYEE") {
      // VI: EMPLOYEE -> auto HOD
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

    if (res.data.role === "ACCOUNTANT") {
      const receiverRes = await getAccountsByRolesApi(["CHIEFACCOUNTANT"]);
      setReceiverList(receiverRes.status === 200 ? receiverRes.data : []);
      setHodError("");
      return;
    }

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

    // VI: MANAGER và role khác -> không có người duyệt
    setReceiverList([]);
    setValue("receiverId", null);
    setHodError("");
  };

  // ================================================
  // VI: Handlers – phê duyệt / từ chối / ký / export / cancel
  // ================================================
  const doHrConfirm = async (id) => {
    setLoading(true);
    const res = await hrConfirmLeaveRequestApi(id);
    setLoading(false);
    if (res.status !== 200) {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "HR confirmation failed!",
        })
      );
    } else {
      dispatch(
        setPopup({ type: "success", message: res.message || "HR confirmed." })
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
    } catch {
      setLoading(false);
      dispatch(
        setPopup({ type: "error", message: "Failed to download file!" })
      );
    }
  };

  const handleApprove = (id) => {
    setCurrentApproveId(id);
    setSignDialogOpen(true);
    setSignError("");
  };

  const handleReject = async (id, reason) => {
    setRejectLoading(true);
    const res = isHrRejectMode
      ? await hrRejectLeaveRequestApi(id, reason)
      : await rejectLeaveRequestApi(id, reason);
    setRejectLoading(false);
    setRejectDialogOpen(false);
    setRejectReason("");
    setRejectTargetId(null);
    setIsHrRejectMode(false);

    if (res.status !== 200) {
      dispatch(
        setPopup({ type: "error", message: res.message || "Reject failed!" })
      );
    } else {
      dispatch(
        setPopup({
          type: "success",
          message:
            res.message ||
            (isHrRejectMode ? "HR rejected." : "Leave request rejected."),
        })
      );
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

  // VI: ký & duyệt (Manager/HOD/ChiefAcc)
  const handleSignAndApprove = async ({
    useSavedSignature,
    savedSignatureBase64,
  }) => {
    let signatureDataUrl = null;
    if (useSavedSignature && savedSignatureBase64) {
      signatureDataUrl = savedSignatureBase64;
    } else {
      if (!signaturePad || signaturePad.isEmpty()) {
        setSignError("Please sign before confirming!");
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

  const handleCancelRequest = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Please enter a cancel reason!");
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
          message: res.message || "Cancel request failed!",
        })
      );
    } else {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "Cancel request sent.",
        })
      );
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
        setPopup({ type: "error", message: res.message || "Cancel failed!" })
      );
    } else {
      dispatch(
        setPopup({
          type: "success",
          message: res.message || "HR cancelled the request.",
        })
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

  // ================================================
  // VI: Menu + Preview flow
  // ================================================
  const actionLabels = {
    export: "Export Word",
    approve: "Approve",
    reject: "Reject",
    hrConfirm: "HR Confirm",
    hrReject: "HR Reject",
    hrCancel: "HR Cancel",
    requestCancel: "Request Cancel",
  };

  const openPreviewWithAction = (row, type) => {
    setPreviewData(row);
    setPendingAction({ type, id: row.id, row });
    setOpenPreview(true);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    const { type, id } = pendingAction;
    setOpenPreview(false);
    setPendingAction(null);
    switch (type) {
      case "export":
        handleExportWord(id);
        break;
      case "approve":
        handleApprove(id);
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

  // ================================================
  // VI: Role-based helpers hiển thị nút
  // ================================================
  const canApproveRow = (row) => {
    if (row.status !== "PENDING") return false;
    if (!account?.id) return false;
    const isReceiver = row?.receiver?.id === account.id;
    if (!isReceiver) return false;

    const senderRole = row?.sender?.role;
    if (isManager)
      return [
        "HOD",
        "PM",
        "HR",
        "ADMIN",
        "SECRETARY",
        "CHIEFACCOUNTANT",
      ].includes(senderRole);
    if (isHOD) return senderRole === "EMPLOYEE";
    if (isChiefAcc) return senderRole === "ACCOUNTANT";
    return false;
  };

  const canHrCancelRow = (row) => isHR && row?.status !== "CANCELLED";

  const canRequestCancel = (row) => {
    if (!account?.id) return false;
    const isOwner = row?.sender?.id === account.id;
    if (!isOwner) return false;
    return ["PENDING", "PENDING_HR", "APPROVED"].includes(row?.status);
  };

  // ================================================
  // VI: Effects – nạp dữ liệu ban đầu & theo filter
  // ================================================
  useEffect(() => {
    fetchAccountAndReceivers();
  }, []);

  useEffect(() => {
    // VI: pending cần duyệt/HR/đã gửi
    if (["HOD", "MANAGER", "CHIEFACCOUNTANT"].includes(account?.role)) {
      getPendingToApproveApi().then((res) => {
        if (res.status === 200 && Array.isArray(res.data))
          setPendingToApprove(res.data);
      });
    }
    if (account?.role === "HR") {
      getPendingHrApi().then((res) => {
        if (res.status === 200 && Array.isArray(res.data))
          setPendingHr(res.data);
      });
    }
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
    if (!showMyPendingSent && !showPendingToApprove && !showPendingHr) {
      fetchLeaveRequests(buildListParams());
    }
  }, [
    status,
    page,
    showMyPendingSent,
    showPendingToApprove,
    showPendingHr,
    departmentName,
    senderName,
    dateFilter,
    monthFilter,
    account,
  ]);

  // VI: count expired last month theo role (để hiển thị câu hợp lý)
  useEffect(() => {
    if (!account) return;
    (async () => {
      const m = new Date().toISOString().slice(0, 7);
      const res = await getMyExpiredCountApi(m);
      if (res?.status === 200) setMyExpiredCount(res.data || 0);
      else setMyExpiredCount(0);
    })();
  }, [account]);

  // ================================================
  // VI: UI event helpers
  // ================================================
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
  const handleMenuOpen = (event, rowId) => {
    setAnchorEl(event.currentTarget);
    setMenuRowId(rowId);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRowId(null);
  };

  // ================================================
  // VI: Form tạo đơn – hook form
  // ================================================
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
      leaveMode: "RANGE",
    },
  });

  // ================================================
  // VI: Mở/đóng dialog tạo đơn + nạp dữ liệu phụ trợ
  // ================================================
  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

  const handleOpenDialog = () => {
    // VI: EMPLOYEE auto set HOD để pass Yup
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
    setCalendarValue([]);
    setSelectedStart("");
    setSelectedEnd("");
    setDialogOpen(true);

    fetchLeaveBalance(getCurrentMonth());

    const departmentId = account?.employee?.department?.id;
    if (departmentId) fetchBusyDays(departmentId, getCurrentMonth());
  };

  const handleCloseDialog = () => setDialogOpen(false);

  // ================================================
  // VI: Submit tạo đơn (giữ logic gốc, đổi message)
  // ================================================
  const onSubmit = async (formData) => {
    setApiError("");
    setLoading(true);

    const dto = {
      reason: formData.reason,
      receiverId: formData.receiverId,
      leaveType,
    };

    if (leaveMode === "RANGE") {
      dto.startDate = formData.startDate;
      dto.endDate = formData.endDate;
    } else if (leaveMode === "MULTI") {
      dto.days = formData.days || [];
    }

    if (leaveType === "CUSTOM_HOURS") {
      dto.startTime = formData.startTime;
      dto.endTime = formData.endTime;
    }

    const res = await createLeaveRequestApi(dto);
    setLoading(false);

    if (res.status !== 201) {
      setApiError(res.message || "Failed to create leave request!");
      dispatch(setPopup({ type: "error", message: res.message }));
    } else {
      dispatch(setPopup({ type: "success", message: res.message }));
      setDialogOpen(false);
      fetchLeaveRequests({ status, page: 1 });
      setPage(1);
    }
  };

  // ================================================
  // VI: Calendar helpers – highlight busy days + chặn Chủ nhật
  // ================================================
  function getBusyDaysInRange(busyDays, startDate, endDate, threshold = 2) {
    if (!startDate || !endDate) return [];
    const busy = [];
    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const found = busyDays.find(
        (b) => b.date === dateStr && b.count >= threshold
      );
      if (found) {
        const [y, m, day] = found.date.split("-");
        busy.push({ date: `${day}/${m}/${y}`, count: found.count });
      }
    }
    return busy;
  }

  function getLeaveTimeDetail(data) {
    if (!data) return "-";
    const fmtT = (t) => (t ? t.slice(0, 5) : "");

    if (
      data.leaveType === "FULL_DAY" &&
      Array.isArray(data.daysOff) &&
      data.daysOff.length > 0
    ) {
      return "Selected dates: " + data.daysOff.map(formatDate).join(", ");
    }
    if (data.leaveType === "FULL_DAY" && data.startDate && data.endDate) {
      if (data.startDate === data.endDate)
        return `On ${formatDate(data.startDate)} (full day)`;
      return `From ${formatDate(data.startDate)} to ${formatDate(
        data.endDate
      )}`;
    }
    if (
      data.leaveType === "HALF_DAY_MORNING" ||
      data.leaveType === "HALF_DAY_AFTERNOON"
    ) {
      const timeRange =
        data.leaveType === "HALF_DAY_MORNING"
          ? "8:00 - 12:00"
          : "13:00 - 17:00";
      return `On ${formatDate(data.startDate)} (${timeRange})`;
    }
    if (data.leaveType === "CUSTOM_HOURS" && data.startTime && data.endTime) {
      return `On ${formatDate(data.startDate)} (${fmtT(
        data.startTime
      )} - ${fmtT(data.endTime)})`;
    }
    return "-";
  }

  // ================================================
  // VI: Render
  // ================================================
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
      <title>Leave Requests</title>

      {/* VI: Page header */}
      <Box sx={{ width: "100%", maxWidth: 2000, mx: "auto", mt: 4, px: 2 }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 2,
            mb: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            flexWrap="wrap"
          >
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Leave Requests
            </Typography>

            {/* VI: Filters */}
            <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
              <Stack
                direction="row"
                gap={2}
                sx={{ flexWrap: "wrap", alignItems: "center" }}
              >
                {account?.role === "HR" && (
                  <TextField
                    size="small"
                    label="Department (name)"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="Enter department name..."
                  />
                )}

                <TextField
                  size="small"
                  label="Sender name / username"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Enter keywords..."
                />

                <TextField
                  size="small"
                  type="date"
                  label="Exact day"
                  InputLabelProps={{ shrink: true }}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />

                <TextField
                  size="small"
                  type="month"
                  label="Month"
                  InputLabelProps={{ shrink: true }}
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />

                <Button
                  variant="text"
                  startIcon={<ClearAllIcon />}
                  onClick={() => {
                    setDepartmentName("");
                    setSenderName("");
                    setDateFilter("");
                    setMonthFilter("");
                    setPage(1);
                    fetchLeaveRequests({ status: "", page: 1 });
                  }}
                >
                  Clear
                </Button>
              </Stack>

              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={handleChangeStatus}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!isManager && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenDialog}
                  sx={{ whiteSpace: "nowrap", borderRadius: 2 }}
                >
                  Create Request
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* VI: Quick-banners */}
        {["EMPLOYEE", "HOD", "PM"].includes(account?.role) &&
          myPendingSent.length > 0 && (
            <Alert
              icon={<FilterAltIcon fontSize="inherit" />}
              severity="info"
              sx={{ mb: 2, borderRadius: 2 }}
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
                    ? "Clear"
                    : `View mine (${myPendingSent.length})`}
                </Button>
              }
            >
              You have <b>{myPendingSent.length}</b>{" "}
              <span style={{ color: "#ff9800" }}>
                requests waiting for approval
              </span>
              .
            </Alert>
          )}

        {["HOD", "MANAGER", "CHIEFACCOUNTANT"].includes(account?.role) &&
          pendingToApprove.length > 0 && (
            <Alert
              icon={<FilterAltIcon fontSize="inherit" />}
              severity="info"
              sx={{ mb: 2, borderRadius: 2 }}
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
                    ? "Clear"
                    : `View pending (${pendingToApprove.length})`}
                </Button>
              }
            >
              You have <b>{pendingToApprove.length}</b>{" "}
              <span style={{ color: "#ff9800" }}>requests to approve</span>.
            </Alert>
          )}

        {isHR && pendingHr.length > 0 && (
          <Alert
            icon={<FilterAltIcon fontSize="inherit" />}
            severity="info"
            sx={{ mb: 2, borderRadius: 2 }}
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
                {showPendingHr
                  ? "Clear"
                  : `View waiting HR (${pendingHr.length})`}
              </Button>
            }
          >
            You have <b>{pendingHr.length}</b>{" "}
            <span style={{ color: "#ff9800" }}>
              requests waiting for HR confirmation
            </span>
            .
          </Alert>
        )}

        {/* VI: Banners cuối tháng */}
        {isReminderWindow && isApprover && pendingForMeThisMonth > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2, borderRadius: 2 }}
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
                {showPendingToApprove ? "Clear" : "Open list"}
              </Button>
            }
          >
            {humanDaysLeftText()}. You have <b>{pendingForMeThisMonth}</b>{" "}
            <span style={{ color: "#ef6c00" }}>pending approvals</span> this
            month.
          </Alert>
        )}

        {isReminderWindow && isHR && pendingHrThisMonth > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2, borderRadius: 2 }}
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
                {showPendingHr ? "Clear" : "Open list"}
              </Button>
            }
          >
            {humanDaysLeftText()}. There are <b>{pendingHrThisMonth}</b>{" "}
            <span style={{ color: "#ef6c00" }}>requests waiting for HR</span>{" "}
            this month.
          </Alert>
        )}

        {/* VI: Expired last month banner – phrasing theo role */}
        {myExpiredCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            You have <b>{myExpiredCount}</b>{" "}
            {isHR ? (
              <>
                request(s) <b>not yet confirmed</b> that expired last month.
              </>
            ) : isApprover ? (
              <>
                request(s) <b>not yet approved</b> that expired last month.
              </>
            ) : (
              <>expired request(s) from last month.</>
            )}
          </Alert>
        )}

        {/* VI: Table */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "primary.light" }}>
                  <TableCell>#</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Time Detail</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Sender</TableCell>
                  <TableCell>Approver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : leaveData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No leave requests
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveData.items.map((row, idx) => {
                    // VI: nhãn loại đơn
                    let typeLabel = "-";
                    if (row.leaveType) {
                      if (row.leaveType === "FULL_DAY") {
                        if (
                          row.daysOff &&
                          Array.isArray(row.daysOff) &&
                          row.daysOff.length > 0
                        )
                          typeLabel = "Split days";
                        else if (
                          row.startDate &&
                          row.endDate &&
                          row.startDate === row.endDate
                        )
                          typeLabel = "Single day";
                        else typeLabel = "Continuous days";
                      } else if (row.leaveType === "HALF_DAY_MORNING")
                        typeLabel = "Half day (AM)";
                      else if (row.leaveType === "HALF_DAY_AFTERNOON")
                        typeLabel = "Half day (PM)";
                      else if (row.leaveType === "CUSTOM_HOURS")
                        typeLabel = "By hours";
                      else typeLabel = row.leaveType;
                    }

                    // VI: chi tiết thời gian
                    let detail = "-";
                    if (
                      row.leaveType === "FULL_DAY" &&
                      row.daysOff &&
                      Array.isArray(row.daysOff) &&
                      row.daysOff.length > 0
                    ) {
                      detail = row.daysOff.map(formatDate).join(", ");
                    } else if (
                      row.leaveType === "FULL_DAY" &&
                      row.startDate &&
                      row.endDate &&
                      row.startDate === row.endDate
                    ) {
                      detail = formatDate(row.startDate);
                    } else if (
                      row.leaveType === "FULL_DAY" &&
                      row.startDate &&
                      row.endDate
                    ) {
                      detail = `${formatDate(row.startDate)} - ${formatDate(
                        row.endDate
                      )}`;
                    } else if (
                      row.leaveType === "HALF_DAY_MORNING" ||
                      row.leaveType === "HALF_DAY_AFTERNOON"
                    ) {
                      const timeRange =
                        row.leaveType === "HALF_DAY_MORNING"
                          ? "8:00 - 12:00"
                          : "13:00 - 17:00";
                      detail = `${formatDate(row.startDate)} (${timeRange})`;
                    } else if (row.leaveType === "CUSTOM_HOURS") {
                      detail =
                        row.startTime && row.endTime
                          ? `${formatDate(
                              row.startDate
                            )} (${row.startTime.slice(
                              0,
                              5
                            )} - ${row.endTime.slice(0, 5)})`
                          : formatDate(row.startDate);
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
                                sx={{
                                  minWidth: 0,
                                  p: 0,
                                  textTransform: "none",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFullReason(row.reason);
                                  setOpenReasonDialog(true);
                                }}
                              >
                                See more
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
                            label={row.status}
                            color={statusColor(row.status)}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Preview">
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
                              <DownloadIcon
                                fontSize="small"
                                style={{ marginRight: 8 }}
                              />
                              Export Word
                            </MenuItem>

                            {canApproveRow(row) && (
                              <>
                                <MenuItem
                                  onClick={() => {
                                    openPreviewWithAction(row, "approve");
                                    handleMenuClose();
                                  }}
                                  sx={{ color: "success.main" }}
                                >
                                  <CheckIcon
                                    fontSize="small"
                                    style={{ marginRight: 8 }}
                                  />
                                  Approve
                                </MenuItem>
                                <MenuItem
                                  onClick={() => {
                                    openPreviewWithAction(row, "reject");
                                    handleMenuClose();
                                  }}
                                  sx={{ color: "error.main" }}
                                >
                                  <CloseIcon
                                    fontSize="small"
                                    style={{ marginRight: 8 }}
                                  />
                                  Reject
                                </MenuItem>
                              </>
                            )}

                            {isHR && row.status === "PENDING_HR" && (
                              <MenuItem
                                onClick={() => {
                                  openPreviewWithAction(row, "hrConfirm");
                                  handleMenuClose();
                                }}
                                sx={{ color: "success.main" }}
                              >
                                <CheckIcon
                                  fontSize="small"
                                  style={{ marginRight: 8 }}
                                />
                                HR Confirm
                              </MenuItem>
                            )}
                            {isHR && row.status === "PENDING_HR" && (
                              <MenuItem
                                onClick={() => {
                                  openPreviewWithAction(row, "hrReject");
                                  handleMenuClose();
                                }}
                                sx={{ color: "error.main" }}
                              >
                                <CloseIcon
                                  fontSize="small"
                                  style={{ marginRight: 8 }}
                                />
                                HR Reject
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
                                HR Cancel
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
                                Request Cancel
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

          <Divider />

          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2 }}>
            <Pagination
              count={leaveData.totalPages || 1}
              page={leaveData.currentPage || 1}
              onChange={handleChangePage}
              color="primary"
              size="medium"
            />
          </Box>
        </Paper>
      </Box>

      {/* =================== Create Dialog =================== */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Leave Request</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pb: 1 }}>
            {/* VI: Thông tin số ngày phép hiện có */}
            {balanceLoading ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Checking remaining leave days...
              </Alert>
            ) : (
              leaveBalance && (
                <>
                  {leaveBalance.leaveLeftInMonth <= 0 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      You have no remaining monthly leave days! (Max 1
                      day/month)
                    </Alert>
                  )}
                  {leaveBalance.leaveLeftInYear < 3 && (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      You only have <b>{leaveBalance.leaveLeftInYear}</b> day(s)
                      left this year.
                    </Alert>
                  )}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Used <b>{leaveBalance.leaveUsedInYear}</b>/
                    <b>{leaveBalance.limitPerYear}</b> days this year,&nbsp;
                    <b>{leaveBalance.leaveUsedInMonth}</b>/
                    <b>{leaveBalance.limitPerMonth}</b> this month.
                  </Alert>
                </>
              )
            )}

            {/* VI: Kiểu nghỉ phép */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Leave Mode</InputLabel>
              <Select
                value={leaveMode}
                label="Leave Mode"
                onChange={(e) => {
                  setLeaveMode(e.target.value);
                  setValue("leaveMode", e.target.value); // VI: Bắt buộc để Yup hiểu mode
                  // reset khi đổi mode
                  setCalendarValue([]);
                  setSelectedStart("");
                  setSelectedEnd("");
                  setMultiDays([]);
                  setValue("days", []);
                  setValue("startDate", "");
                  setValue("endDate", "");
                  if (e.target.value === "MULTI") setLeaveType("FULL_DAY");
                }}
                disabled={loading}
              >
                <MenuItem value="RANGE">Continuous (start-end)</MenuItem>
                <MenuItem value="MULTI">Split days (multiple dates)</MenuItem>
              </Select>
            </FormControl>

            {/* VI: Loại nghỉ */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Leave Type</InputLabel>
              <Select
                value={leaveType}
                label="Leave Type"
                onChange={(e) => setLeaveType(e.target.value)}
                disabled={loading || leaveMode === "MULTI"}
              >
                <MenuItem value="FULL_DAY">Full day</MenuItem>
                <MenuItem value="HALF_DAY_MORNING">Half day (AM)</MenuItem>
                <MenuItem value="HALF_DAY_AFTERNOON">Half day (PM)</MenuItem>
                <MenuItem value="CUSTOM_HOURS">By hours</MenuItem>
              </Select>
            </FormControl>

            {/* VI: Lý do */}
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Reason"
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

            {/* VI: Calendar chọn ngày */}
            <Box mt={2} sx={{ mb: 2 }}>
              <Typography fontWeight={600} mb={1}>
                Pick date(s)
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
                locale="en"
                format="YYYY-MM-DD"
                className="green"
                weekStartDayIndex={1}
                plugins={[<DatePanel key="panel" header="Selected" />]}
                mapDays={({ date }) => {
                  const props = {};
                  // VI: disable Chủ nhật
                  if (date.weekDay.index === 0) {
                    props.disabled = true;
                    props.className = "sunday-disabled";
                    props.title = "Sunday";
                  }
                  // VI: đánh dấu ngày bận (>=2)
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
                        `${found.count} people off`;
                    }
                  } catch {}
                  return props;
                }}
              />
              {/* Lỗi endDate cho chế độ RANGE hiển thị ngay dưới lịch */}
              {leaveMode === "RANGE" && errors?.endDate?.message && (
                <Typography
                  color="error"
                  variant="caption"
                  sx={{ mt: 1, display: "block" }}
                >
                  {errors.endDate.message}
                </Typography>
              )}

              <style>
                {`
                  .rmdp-day.sunday-disabled span{
                    color:#9e9e9e!important; background:#f5f5f5!important; border:1px dashed #e0e0e0!important; box-shadow:none!important;
                  }
                  .rmdp-day.sunday-disabled span:hover{ background:#f5f5f5!important; }
                `}
              </style>

              {leaveMode === "MULTI" &&
                Array.isArray(calendarValue) &&
                calendarValue.length > 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Selected:{" "}
                    {calendarValue
                      .map((d) =>
                        typeof d === "string" ? d : d.format?.("DD/MM/YYYY")
                      )
                      .join(", ")}
                  </Alert>
                )}

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
                        {`On ${item.date}, your department already has `}
                        <b>{item.count}</b> people off. Please consider before
                        submitting.
                      </div>
                    ))}
                  </Alert>
                )}

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
                      On <b>{`${day}/${m}/${y}`}</b>, your department already
                      has <b>{found.count}</b> people off.
                    </Alert>
                  );
                })}
            </Box>

            {/* VI: By hours */}
            {leaveType === "CUSTOM_HOURS" && (
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Controller
                  name="startTime"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Start time"
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
                      label="End time"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      disabled={loading}
                    />
                  )}
                />
              </Stack>
            )}

            {/* VI: Người duyệt */}
            <Controller
              name="receiverId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="normal" error={!!hodError}>
                  <InputLabel>Approver</InputLabel>
                  <Select
                    {...field}
                    label="Approver"
                    disabled={
                      loading || receiverList.length === 0 || !!hodError
                    }
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !!hodError || receiverList.length === 0}
            >
              {loading ? <CircularProgress size={20} /> : "Submit"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* =================== Sign Dialog =================== */}
      <Dialog
        open={signDialogOpen}
        onClose={() => setSignDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Sign to Confirm</DialogTitle>
        <DialogContent>
          {loadingSignature ? (
            <Box sx={{ textAlign: "center", p: 3 }}>
              <CircularProgress size={28} />
              <Typography fontSize={14} mt={1}>
                Checking saved signature...
              </Typography>
            </Box>
          ) : (
            <>
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
                      Use saved signature
                    </label>
                    <img
                      src={savedSignature}
                      alt="Saved signature"
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

              {!useSavedSignature && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Button onClick={() => signaturePad && signaturePad.clear()}>
                    Clear
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
            Close
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
            {loading ? <CircularProgress size={20} /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== Preview Dialog =================== */}
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
          Preview – Leave Application
        </DialogTitle>
        <DialogContent sx={{ px: 6, py: 4 }}>
          {/* VI: Template giữ nguyên cấu trúc, đổi câu chữ sang tiếng Anh */}
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
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM <br />
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
              LEAVE APPLICATION
            </div>
            <div style={{ fontSize: 16, marginBottom: 20 }}>
              <span style={{ fontWeight: "bold" }}>To:</span> Board of Directors
              – NEX VIETNAM Co., Ltd
              <br />
              <span style={{ marginLeft: 42 }}>
                – {previewData?.receiver?.fullName} (
                {previewData?.receiver?.role})
              </span>
              <br />
              <span style={{ fontWeight: "bold" }}>My name:</span>{" "}
              {previewData?.sender?.fullName}
              <br />
              <span style={{ fontWeight: "bold" }}>Position:</span>{" "}
              {previewData?.sender?.role}
              <br />
              <span style={{ fontWeight: "bold" }}>Phone:</span>{" "}
              {previewData?.sender?.phone}
              <br />
              <span style={{ fontWeight: "bold" }}>Email:</span>{" "}
              {previewData?.sender?.email}
            </div>

            <div style={{ fontSize: 16, margin: "18px 0" }}>
              I kindly request leave during:
              <br />
              <span style={{ fontWeight: 700 }}>
                {getLeaveTimeDetail(previewData)}
              </span>
            </div>

            <div style={{ fontSize: 16, margin: "12px 0" }}>
              Reason:{" "}
              <span style={{ fontWeight: "bold" }}>{previewData?.reason}</span>
            </div>

            <div style={{ fontSize: 16, margin: "24px 0" }}>
              Please consider and approve my request. Thank you very much!
            </div>

            <div style={{ display: "flex", marginTop: 50 }}>
              <div style={{ flex: 1 }}></div>
              <div style={{ textAlign: "center", flex: 1, fontSize: 16 }}>
                Ho Chi Minh City, {getDay(previewData?.createdAt)}/
                {getMonth(previewData?.createdAt)}/
                {getYear(previewData?.createdAt)}
              </div>
            </div>

            <div style={{ display: "flex", marginTop: 28 }}>
              <div style={{ flex: 1, textAlign: "center" }}>Applicant</div>
              <div style={{ flex: 1, textAlign: "center" }}>Approver</div>
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
            startIcon={<DownloadIcon />}
          >
            Export Word
          </Button>
          {pendingAction && (
            <Button
              onClick={executePendingAction}
              variant="contained"
              color="primary"
            >
              {`Continue: ${actionLabels[pendingAction.type] || "Action"}`}
            </Button>
          )}
          <Button
            onClick={() => {
              setOpenPreview(false);
              setPendingAction(null);
            }}
            color="secondary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== Reject Dialog =================== */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reject Reason</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason"
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
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!rejectReason.trim()) {
                setRejectError("Please enter a reason!");
                return;
              }
              setRejectError("");
              await handleReject(rejectTargetId, rejectReason);
            }}
            color="error"
            variant="contained"
            disabled={rejectLoading}
          >
            {rejectLoading ? <CircularProgress size={18} /> : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== Request-Cancel Dialog =================== */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Request to Cancel</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will email both the <b>Approver</b> and <b>HR</b>.
          </Alert>
          <TextField
            label="Cancel reason"
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
            Close
          </Button>
          <Button
            onClick={handleCancelRequest}
            variant="contained"
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={18} /> : "Send request"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== HR Cancel Confirm Dialog =================== */}
      <Dialog
        open={hrCancelDialogOpen}
        onClose={() => setHrCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm HR Cancel</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will <b>cancel</b> the leave request and email the
            applicant.
          </Alert>
          <Typography>Are you sure you want to cancel this request?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setHrCancelDialogOpen(false)}
            color="secondary"
            disabled={hrCancelLoading}
          >
            Close
          </Button>
          <Button
            onClick={handleHrCancel}
            variant="contained"
            color="error"
            disabled={hrCancelLoading}
          >
            {hrCancelLoading ? (
              <CircularProgress size={18} />
            ) : (
              "Cancel request"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== Full Reason Dialog =================== */}
      <Dialog
        open={openReasonDialog}
        onClose={() => setOpenReasonDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Leave Reason</DialogTitle>
        <DialogContent>
          <Typography>{fullReason}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReasonDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
