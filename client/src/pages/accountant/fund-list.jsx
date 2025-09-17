"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "@mui/material/styles";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useTranslation } from "react-i18next";
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
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Pagination,
  Card,
  CardContent,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
  Fade,
  Collapse,
  InputAdornment,
} from "@mui/material";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import AccountBalance from "@mui/icons-material/AccountBalance";
import TrendingUp from "@mui/icons-material/TrendingUp";
import TrendingDown from "@mui/icons-material/TrendingDown";
import Receipt from "@mui/icons-material/Receipt";
import Add from "@mui/icons-material/Add";
import FilterList from "@mui/icons-material/FilterList";
import Refresh from "@mui/icons-material/Refresh";
import Search from "@mui/icons-material/Search";
import CalendarToday from "@mui/icons-material/CalendarToday";
import MonetizationOn from "@mui/icons-material/MonetizationOn";
import Close from "@mui/icons-material/Close";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Cancel from "@mui/icons-material/Cancel";
import UploadFile from "@mui/icons-material/UploadFile";

import {
  createFundApi,
  getFundsApi,
  createTransactionApi,
  getAllTransactionsApi,
  getFundSummaryApi,
} from "~/services/accountant/fund.service";
import { getBankSnapshotApi, refreshBankApi } from "~/services/bank.service";
import CustomAvatar from "~/components/custom-avatar";
import { formatCurrency } from "~/utils/function";
import i18n from "~/i18n";

export default function FundList({ accessToken }) {
  const { t } = useTranslation("fund_page");
  const { t: tMessages } = useTranslation("messages");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [funds, setFunds] = useState([]);
  const [formError, setFormError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  //Summary
  const [totalFundsCount, setTotalFundsCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalIncreased, setTotalIncreased] = useState(0);
  const [totalDecreased, setTotalDecreased] = useState(0);
  const [previousTotalIncreased, setPreviousTotalIncreased] = useState(null);
  const [previousTotalDecreased, setPreviousTotalDecreased] = useState(null);
  const [previousBalance, setPreviousBalance] = useState(null);
  const [compareMode, setCompareMode] = useState("previous");

  //Loading
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  //Image
  const [selectedImage, setSelectedImage] = useState(null);

  //Pagination
  const [pagination, setPagination] = useState({
    currentPage: null,
    totalPages: null,
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  const didAutoRefreshRef = useRef(false);

  const [newFund, setNewFund] = useState({
    name: "",
    balance: "",
    purpose: "",
  });

  const [transactionDialog, setTransactionDialog] = useState({
    open: false,
    fundId: null,
    amount: "",
    type: "INCREASE",
    note: "",
    file: null,
  });

  const [filters, setFilters] = useState({
    name: "",
    status: "",
    createdAfter: "",
    createdBefore: "",
    balanceMin: "",
    balanceMax: "",
  });

  const [refreshing, setRefreshing] = useState(false);
  const [bankSnapshot, setBankSnapshot] = useState(null);

  function parseApiError(res, defaultKey = "unexpected-error-occurred") {
    if (res?.status === 400 && res.errors) {
      const firstKey = Object.keys(res.errors)[0];
      return res.errors[firstKey];
    }
    if (res?.message) return res.message;
    return defaultKey;
  }

  useEffect(() => {
    fetchFunds(false);
  }, [filters, currentPage, pageSize]);

  useEffect(() => {
    fetchSummary();
    fetchFunds(false);
  }, []);

  const fetchSummary = async () => {
    const res = await getFundSummaryApi();
    if (res?.status === 200 && res.data) {
      const s = res.data;
      setTransactionCount(s.transactionCount);
      setTotalPending(s.totalPending);
      setTotalIncreased(s.totalIncreased);
      setTotalDecreased(s.totalDecreased);
      setPreviousTotalIncreased(s.previousTotalIncreased);
      setPreviousTotalDecreased(s.previousTotalDecreased);
      setPreviousBalance(s.previousBalance);
      setCurrentBalance(s.totalBalance);
      setTotalFundsCount(s.totalFunds);
    } else {
      setTransactionCount(0);
      setTotalPending(0);
      setTotalIncreased(0);
      setTotalDecreased(0);
      setPreviousTotalIncreased(null);
      setPreviousTotalDecreased(null);
      setPreviousBalance(null);
      setCurrentBalance(0);
      setTotalFundsCount(0);
    }
  };

  const fetchFunds = async (updateBalanceHistory = true) => {
    setLoading(true);
    const { createdAfter, createdBefore, ...rest } = filters;
    const params = {
      ...rest,
      createdAfter: createdAfter
        ? new Date(createdAfter).toISOString()
        : undefined,
      createdBefore: createdBefore
        ? new Date(createdBefore).toISOString()
        : undefined,
      page: currentPage,
      size: pageSize,
    };
    const cleanedParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    );

    const res = await getFundsApi(cleanedParams, accessToken);
    if (res?.status === 200) {
      setFunds(res.data.items);
      setPagination({
        currentPage: res.data.currentPage,
        totalPages: res.data.totalPages,
      });
    } else {
      setFunds([]);
    }
    setLoading(false);
  };

  const calcPercentChange = (current, previous) => {
    if (previous === null || previous === 0) return null;
    const diff = current - previous;
    return ((diff / previous) * 100).toFixed(2);
  };

  const handleCreate = async () => {
    const res = await createFundApi(
      {
        name: newFund.name,
        balance: Number.parseFloat(newFund.balance),
        purpose: newFund.purpose,
      },
      accessToken
    );
    if (res?.status === 201) {
      setOpenCreate(false);
      setNewFund({ name: "", balance: "", purpose: "" });
      await fetchSummary();
      await fetchFunds();
      dispatch(
        setPopup({
          type: "success",
          message: tMessages("fund-created"),
        })
      );
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: tMessages(parseApiError(res, "failed-to-create-fund")),
        })
      );
    }
  };

  const handleCreateTransaction = async () => {
    setFormError("");

    const rawAmount = Number(transactionDialog.amount);

    if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
      setFormError(tMessages("invalid-amount"));
      return;
    }

    const formData = new FormData();
    formData.append("amount", rawAmount);
    formData.append("type", transactionDialog.type);
    formData.append("note", transactionDialog.note);
    if (transactionDialog.file) {
      formData.append("file", transactionDialog.file);
    }

    const res = await createTransactionApi(
      transactionDialog.fundId,
      formData,
      accessToken
    );

    if (res?.status === 201) {
      setTransactionDialog({ ...transactionDialog, open: false });
      await fetchSummary();
      await fetchFunds();
      dispatch(
        setPopup({
          type: "success",
          message: tMessages("transaction-created"),
        })
      );
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: tMessages(
            parseApiError(res, "failed-to-create-transaction")
          ),
        })
      );
    }
  };

  const handleResetFilters = () => {
    setFilters({
      name: "",
      status: "",
      createdAfter: "",
      createdBefore: "",
      balanceMin: "",
      balanceMax: "",
    });
  };
  const fetchBankSnapshot = async () => {
    const res = await getBankSnapshotApi();
    if (res?.status === 200) {
      setBankSnapshot(res.data);
    } else {
      setBankSnapshot(null);
    }
  };

  useEffect(() => {
    fetchBankSnapshot();
  }, []);

  const handleRefresh = async (showToast = true) => {
    try {
      setRefreshing(true);
      await refreshBankApi();
      await Promise.all([
        fetchSummary(),
        fetchFunds(false),
        fetchBankSnapshot(),
      ]);
      if (showToast) {
        dispatch(
          setPopup({
            type: "success",
            message: tMessages("refreshed-successfully"),
          })
        );
      }
    } catch (e) {
      if (showToast) {
        dispatch(
          setPopup({ type: "error", message: tMessages("refresh-failed") })
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (didAutoRefreshRef.current) return;
    didAutoRefreshRef.current = true;
    handleRefresh(false);
  }, []);
  return (
    <Box
      sx={{
        p: 3,
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Header Section */}
      <Card
        sx={{
          mb: 3,
          background: "#118D57",
          color: "white",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {t("budget-group")}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                {t("manage-and-monitor-all-financial-funds")}
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  backdropFilter: "blur(10px)",
                }}
              >
                {refreshing ? t("refreshing") : t("refresh")}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} alignItems="stretch" sx={{ mb: 3 }}>
        {/* Total Funds */}
        <Grid
          sx={{
            gridColumn: {
              xs: "span 12",
              sm: "span 6",
              md: "span 4",
              lg: "span 2",
            },
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              color: "white",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.3s ease",
              height: "100%",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 40px rgba(79, 172, 254, 0.4)",
              },
            }}
            onClick={() => setFilters({ ...filters, status: "" })}
          >
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexGrow={1}
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {totalFundsCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {t("total-funds")}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    width: 56,
                    height: 56,
                  }}
                >
                  <AccountBalance sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Added */}
        <Grid
          sx={{
            gridColumn: {
              xs: "span 12",
              sm: "span 6",
              md: "span 4",
              lg: "span 2",
            },
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
              color: "#333",
              borderRadius: 3,
              transition: "all 0.3s ease",
              height: "100%",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexGrow={1}
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(totalIncreased, i18n.language)}
                  </Typography>

                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {t("total-added")}
                  </Typography>
                </Box>
                <Avatar
                  sx={{ bgcolor: "rgba(0,0,0,0.1)", width: 56, height: 56 }}
                >
                  <TrendingUp sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Spent */}
        <Grid
          sx={{
            gridColumn: {
              xs: "span 12",
              sm: "span 6",
              md: "span 4",
              lg: "span 2",
            },
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
              color: "#333",
              borderRadius: 3,
              transition: "all 0.3s ease",
              height: "100%",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexGrow={1}
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(totalDecreased, i18n.language)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    {t("total-spent")}
                  </Typography>
                </Box>
                <Avatar
                  sx={{ bgcolor: "rgba(0,0,0,0.1)", width: 56, height: 56 }}
                >
                  <TrendingDown sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Transactions */}
        <Grid
          sx={{
            gridColumn: {
              xs: "span 12",
              sm: "span 6",
              md: "span 4",
              lg: "span 2",
            },
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.3s ease",
              height: "100%",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
              },
            }}
            onClick={() => navigate("/finance/fund/transactions")}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexGrow={1}
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {transactionCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {t("total-transactions")}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    width: 56,
                    height: 56,
                  }}
                >
                  <Receipt sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Transactions Pending*/}
        <Grid
          sx={{
            gridColumn: {
              xs: "span 12",
              sm: "span 6",
              md: "span 4",
              lg: "span 2",
            },
          }}
        >
          <Card
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.3s ease",
              height: "100%",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
              },
            }}
            onClick={() =>
              navigate("/finance/fund/transactions?status=Pending")
            }
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexGrow={1}
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {totalPending}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {t("total-transactions-pending")}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    width: 56,
                    height: 56,
                  }}
                >
                  <Receipt sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Balance */}
        <Grid
          sx={{
            gridColumn: {
              xs: "span 12",
              sm: "span 6",
              md: "span 4",
              lg: "span 2",
            },
          }}
        >
          <Card
            sx={{
              background:
                "linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #ef6c00 100%)",
              color: "white",
              borderRadius: 3,
              cursor: "pointer",
              transition: "all 0.3s ease",
              height: "100%",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 40px rgba(255, 152, 0, 0.4)",
              },
            }}
          >
            <CardContent
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                flexGrow={1}
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(currentBalance, i18n.language)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {t("total-balance")}
                  </Typography>
                  {previousBalance !== null && (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{ mt: 1 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.8 }}
                      ></Typography>
                      <Chip
                        size="small"
                        label={
                          calcPercentChange(currentBalance, previousBalance) !==
                          null
                            ? `${
                                calcPercentChange(
                                  currentBalance,
                                  previousBalance
                                ) > 0
                                  ? "+"
                                  : ""
                              }${calcPercentChange(
                                currentBalance,
                                previousBalance
                              )}%`
                            : "N/A"
                        }
                        sx={{
                          bgcolor: "rgba(255,255,255,0.2)",
                          color: "white",
                          fontSize: "0.7rem",
                          height: 20,
                          "& .MuiChip-label": { px: 1 },
                        }}
                      />
                    </Box>
                  )}
                </Box>
                <Avatar
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    width: 56,
                    height: 56,
                  }}
                >
                  <MonetizationOn sx={{ fontSize: 28 }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Section */}
      <Card sx={{ mb: 3, borderRadius: 3, overflow: "hidden" }}>
        <Box
          sx={{
            p: 2,
            background: "linear-gradient(135deg, #118D57 0%, #118D57 100%)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            "&:hover": {
              background: "linear-gradient(135deg, #0E7A4C 0%, #118D57 100%)",
            },
          }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList />
              <Typography component="span" variant="h6" fontWeight={600}>
                {t("advanced-filters")} (
                {Object.values(filters).filter(Boolean).length} {t("active")})
              </Typography>
            </Box>
            {showFilters ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </Box>

        <Collapse in={showFilters}>
          <CardContent sx={{ p: 3, bgcolor: "#fafafa" }}>
            <Grid container spacing={3}>
              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  fullWidth
                  label={t("name")}
                  value={filters.name}
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
              </Grid>

              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  fullWidth
                  select
                  label={t("status")}
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                    minWidth: 130,
                  }}
                >
                  <MenuItem value="">{t("all")}</MenuItem>
                  <MenuItem value="ACTIVE">{t("active")}</MenuItem>
                  <MenuItem value="LOCKED">{t("locked")}</MenuItem>
                </TextField>
              </Grid>

              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  type="number"
                  label={t("rows-per-page")}
                  value={pageSize}
                  onChange={(e) => {
                    let val = Number.parseInt(e.target.value, 10);
                    if (isNaN(val) || val <= 0) {
                      val = 1;
                    }
                    setPageSize(val);
                    setCurrentPage(0);
                  }}
                  inputProps={{ min: 1, step: 1 }}
                  sx={{
                    width: 80,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
              </Grid>

              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  fullWidth
                  type="datetime-local"
                  label={t("created-after")}
                  InputLabelProps={{ shrink: true }}
                  value={filters.createdAfter}
                  onChange={(e) =>
                    setFilters({ ...filters, createdAfter: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
              </Grid>

              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  fullWidth
                  type="datetime-local"
                  label={t("created-before")}
                  InputLabelProps={{ shrink: true }}
                  value={filters.createdBefore}
                  onChange={(e) =>
                    setFilters({ ...filters, createdBefore: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarToday color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
              </Grid>

              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  fullWidth
                  type="number"
                  label={t("balance-min")}
                  value={filters.balanceMin}
                  onChange={(e) =>
                    setFilters({ ...filters, balanceMin: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography fontWeight={600} color="text.secondary">
                          ₫
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
              </Grid>

              <Grid
                sx={{
                  gridColumn: { xs: "span 12", sm: "span 6", md: "span 3" },
                }}
              >
                <TextField
                  fullWidth
                  type="number"
                  label={t("balance-max")}
                  value={filters.balanceMax}
                  onChange={(e) =>
                    setFilters({ ...filters, balanceMax: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography fontWeight={600} color="text.secondary">
                          ₫
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: "white",
                    },
                  }}
                />
              </Grid>

              <Grid sx={{ gridColumn: { xs: "span 12" } }}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={handleResetFilters}
                    sx={{
                      width: 200,
                      height: 56,
                      borderRadius: 2,
                      background:
                        "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
                      color: "white",
                      border: "none",
                      fontWeight: 600,
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #ee5a24 0%, #ff6b6b 100%)",
                        border: "none",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    {t("reset-all-filters")}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Collapse>
      </Card>

      {/* Funds Table */}
      <Card
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}
      >
        {loading ? (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            p={6}
          >
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography component="span" variant="h6" color="text.secondary">
              {t("loading-funds")}...
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ width: "100%", overflowX: "hidden" }}>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "linear-gradient(135deg, #0E7A4C 0%, #118D57 100%)",
                    "& .MuiTableCell-head": {
                      color: "white",
                      fontWeight: 700,
                      fontSize: "1rem",
                      py: 2,
                    },
                  }}
                >
                  <TableCell align="center">ID</TableCell>
                  <TableCell align="center">{t("name")}</TableCell>
                  <TableCell align="center">{t("balance")}</TableCell>
                  <TableCell align="center">{t("status")}</TableCell>
                  <TableCell align="center">{t("created-by")}</TableCell>
                  <TableCell align="center">{t("date")}</TableCell>
                  <TableCell align="center">{t("purpose")}</TableCell>
                  <TableCell align="center">{t("actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {funds.length > 0 ? (
                  funds.map((fund, index) => (
                    <Fade in={true} timeout={300 + index * 100} key={fund.id}>
                      <TableRow
                        sx={{
                          "&:nth-of-type(odd)": {
                            backgroundColor: "rgba(0, 0, 0, 0.02)",
                          },
                          "&:hover": {
                            backgroundColor: "rgba(103, 126, 234, 0.08)",
                            transform: "scale(1.001)",
                            transition: "all 0.2s ease",
                          },
                          cursor: "pointer",
                        }}
                        onClick={() => navigate(`/finance/fund/${fund.id}`)}
                      >
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="primary"
                          >
                            {fund.id}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" fontWeight={600}>
                            {fund.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            component="span"
                            variant="h6"
                            fontWeight={700}
                            color="success.main"
                          >
                            {fund.balance?.toLocaleString()} ₫
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={t(
                              fund.status === "ACTIVE" ? "active" : "locked"
                            )}
                            color={
                              fund.status === "ACTIVE" ? "success" : "error"
                            }
                            icon={
                              fund.status === "ACTIVE" ? (
                                <CheckCircle />
                              ) : (
                                <Cancel />
                              )
                            }
                            sx={{
                              fontWeight: 600,
                              "& .MuiChip-icon": { fontSize: 16 },
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            gap={1}
                          >
                            <CustomAvatar
                              src={fund.createdByAvatar}
                              sx={{
                                width: 30,
                                height: 30,
                              }}
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {fund.createdBy}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={500}>
                            {fund.createdAt
                              ? new Date(fund.createdAt).toLocaleDateString()
                              : "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fund.createdAt
                              ? new Date(fund.createdAt).toLocaleTimeString()
                              : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fund.purpose}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            display="flex"
                            flexDirection="column"
                            gap={1}
                            alignItems="center"
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<AddCircleOutline />}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (fund.name === "Bank Fund") {
                                  navigate("/payment"); // dùng React Router
                                  return;
                                }
                                setTransactionDialog({
                                  open: true,
                                  fundId: fund.id,
                                  amount: "",
                                  type: "INCREASE",
                                  note: "",
                                  file: null,
                                });
                              }}
                              sx={{
                                minWidth: 170,
                                "&:hover": {
                                  backgroundColor: "primary.main",
                                  color: "#fff",
                                  borderColor: "primary.main",
                                },
                              }}
                            >
                              {t("new-transaction")}
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    </Fade>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={2}
                      >
                        <AccountBalance
                          sx={{
                            fontSize: 64,
                            color: "text.secondary",
                            opacity: 0.5,
                          }}
                        />
                        <Typography
                          variant="h5"
                          color="text.secondary"
                          fontWeight={600}
                        >
                          {t("no-funds-found")}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {t("no-data-available")}
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={handleResetFilters}
                          sx={{
                            mt: 2,
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                            },
                          }}
                        >
                          {t("clear-all-filters")}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Pagination */}
      <Box mt={3} display="flex" justifyContent="center">
        <Pagination
          count={pagination.totalPages}
          page={pagination.currentPage + 1}
          onChange={(e, value) => setCurrentPage(value - 1)}
          color="primary"
          size="large"
          sx={{
            "& .MuiPaginationItem-root": {
              borderRadius: 2,
              fontWeight: 600,
            },
            "& .Mui-selected": {
              background: "linear-gradient(135deg, #118D57 0%, #0E7A4C 100%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(135deg, #0E7A4C 0%, #118D57 100%)",
              },
            },
          }}
        />
      </Box>

      {/* Transaction Dialog */}
      <Dialog
        open={transactionDialog.open}
        onClose={() =>
          setTransactionDialog({ ...transactionDialog, open: false })
        }
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <Typography component="span" variant="h6" fontWeight={600}>
            {t("create-new-transaction")}
          </Typography>
          <IconButton
            onClick={() =>
              setTransactionDialog({ ...transactionDialog, open: false })
            }
            sx={{
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        {/* Content */}
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Amount */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("amount")}
                type="number"
                value={transactionDialog.amount}
                onChange={(e) =>
                  setTransactionDialog({
                    ...transactionDialog,
                    amount: e.target.value,
                  })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {i18n.language === "vi" ? "VNĐ" : "VNĐ"}
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    height: 56,
                  },
                }}
              />
            </Grid>

            {/* Type */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label={t("type")}
                value={transactionDialog.type}
                onChange={(e) =>
                  setTransactionDialog({
                    ...transactionDialog,
                    type: e.target.value,
                  })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    height: 56,
                  },
                }}
              >
                <MenuItem value="INCREASE">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUp color="success" />
                    {t("increase")}
                  </Box>
                </MenuItem>
                <MenuItem value="DECREASE">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingDown color="error" />
                    {t("decrease")}
                  </Box>
                </MenuItem>
              </TextField>
            </Grid>

            {/* Note */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("note")}
                multiline
                rows={3}
                value={transactionDialog.note}
                onChange={(e) =>
                  setTransactionDialog({
                    ...transactionDialog,
                    note: e.target.value,
                  })
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
              />
            </Grid>

            {/* Upload File */}
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{
                  height: 56,
                  borderRadius: 3,
                  borderStyle: "dashed",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "rgba(102,126,234,0.04)",
                  },
                }}
              >
                <UploadFile />
                {t(transactionDialog.file ? "change-file" : "upload-file")}
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const allowedTypes = [
                        "image/png",
                        "image/jpeg",
                        "application/pdf",
                      ];
                      if (!allowedTypes.includes(file.type)) {
                        dispatch(
                          setPopup({
                            type: "error",
                            message: tMessages("file-type-not-supported"),
                          })
                        );
                        return;
                      }
                      setTransactionDialog({ ...transactionDialog, file });
                    }
                  }}
                />
              </Button>

              {/* Preview */}
              {transactionDialog.file && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "success.main", mb: 1 }}
                  >
                    {t("selected-file")}: {transactionDialog.file.name}
                  </Typography>
                  {transactionDialog.file.type.startsWith("image/") && (
                    <Box
                      component="img"
                      src={URL.createObjectURL(transactionDialog.file)}
                      alt="preview"
                      sx={{
                        maxWidth: "100%",
                        maxHeight: 200,
                        borderRadius: 2,
                        border: "2px solid #e0e0e0",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() =>
              setTransactionDialog({ ...transactionDialog, open: false })
            }
            sx={{
              borderRadius: 3,
              px: 3,
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTransaction}
            disabled={!transactionDialog.amount}
            sx={{
              borderRadius: 3,
              px: 3,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
              },
            }}
          >
            {t("submit")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography component="span" variant="h6" fontWeight={600}>
            {t("preview-image")}
          </Typography>
          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 3,
            bgcolor: "#f5f5f5",
          }}
        >
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "70vh",
                borderRadius: 3,
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
