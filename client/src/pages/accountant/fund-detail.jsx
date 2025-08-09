"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  TableContainer,
  Card,
  CardContent,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
  Fade,
  Alert,
  AlertTitle,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import AccountBalance from "@mui/icons-material/AccountBalance";
import TrendingUp from "@mui/icons-material/TrendingUp";
import TrendingDown from "@mui/icons-material/TrendingDown";
import Receipt from "@mui/icons-material/Receipt";
import MonetizationOn from "@mui/icons-material/MonetizationOn";
import Timeline from "@mui/icons-material/Timeline";
import Security from "@mui/icons-material/Security";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Cancel from "@mui/icons-material/Cancel";
import Schedule from "@mui/icons-material/Schedule";
import Refresh from "@mui/icons-material/Refresh";
import Clear from "@mui/icons-material/Clear";

import {
  getFundByIdApi,
  getTransactionsApi,
  updateFundApi,
  getFundEditHistoryApi,
} from "~/services/accountant/fund.service";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useDispatch } from "react-redux";
import CustomAvatar from "~/components/custom-avatar";

export default function FundDetails() {
  const { fundID } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [editForm, setEditForm] = useState({
    name: "",
    purpose: "",
    balance: 0,
  });

  // Filter states
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const dispatch = useDispatch();

  useEffect(() => {
    fetchData();
  }, [fundID]);

  const fetchData = async () => {
    setTransactionsLoading(true);
    try {
      const fundRes = await getFundByIdApi(fundID);
      setFund(fundRes?.data || null);

      const txRes = await getTransactionsApi(fundID);
      setTransactions(txRes?.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setFund(null);
      setTransactions([]);
    }
    setTransactionsLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "PENDING":
        return "warning";
      case "REJECTED":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case "PENDING":
        return <Schedule sx={{ fontSize: 16 }} />;
      case "REJECTED":
        return <Cancel sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const clearFilters = () => {
    setFilterKeyword("");
    setFilterType("");
    setFilterStatus("");
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const keywordMatch =
        tx.note?.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        tx.createdBy?.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        tx.createdByDisplay
          ?.toLowerCase()
          .includes(filterKeyword.toLowerCase());
      const typeMatch = filterType ? tx.type === filterType : true;
      const statusMatch = filterStatus ? tx.status === filterStatus : true;
      return keywordMatch && typeMatch && statusMatch;
    });
  }, [transactions, filterKeyword, filterType, filterStatus]);

  const fetchEditHistory = async () => {
    try {
      const res = await getFundEditHistoryApi(fund.id);
      setEditHistory(res.data);
      setHistoryOpen(true);
    } catch (error) {
      dispatch(setPopup({ message: "Không lấy được lịch sử", type: "error" }));
    }
  };

  const handleUpdateFund = async () => {
  try {
    const payload = {
      name: editForm.name,
      purpose: editForm.purpose,
      balance: editForm.balance,
    };
    const res = await updateFundApi(fund.id, payload);
    setFund(res.data); 
    dispatch(setPopup({ message: "Cập nhật quỹ thành công", type: "success" }));
    setEditOpen(false);
  } catch (error) {
    dispatch(setPopup({ message: "Cập nhật thất bại", type: "error" }));
  }
};

  if (!fund) {
    return (
      <Box
        sx={{
          p: 4,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          minHeight: "100vh",
        }}
      >
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          <AlertTitle>Fund Not Found</AlertTitle>
          The requested fund could not be found or you don't have permission to
          view it.
        </Alert>
        <Button 
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          bgcolor: "primary.main",
          color: "white",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                <ArrowBack />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {fund.name}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  {fund.purpose}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                onClick={() => {
                  setEditForm({
                    name: fund.name,
                    purpose: fund.purpose,
                    balance: fund.balance,
                  });
                  setEditOpen(true);
                }}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  backdropFilter: "blur(10px)",
                  color: "white",
                }}
              >
                Edit
              </Button>

              <Button
                variant="contained"
                onClick={fetchEditHistory}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  backdropFilter: "blur(10px)",
                  color: "white",
                }}
              >
                Edit history
              </Button>

              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={fetchData}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  backdropFilter: "blur(10px)",
                  color: "white",
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Balance */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              color: "white",
            }}
          >
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    ${Number(fund.balance).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Current Balance
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)" }}>
                  <MonetizationOn />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            label="Search"
            fullWidth
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            label="Type"
            select
            fullWidth
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="INCREASE">Increase</MenuItem>
            <MenuItem value="DECREASE">Decrease</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            label="Status"
            select
            fullWidth
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <Button
            fullWidth
            startIcon={<Clear />}
            onClick={clearFilters}
            variant="outlined"
            sx={{
              height: "56px",
              fontWeight: 500,
            }}
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>

      {/* Transactions */}
      <Card>
        <Box
          sx={{
            p: 2,
            bgcolor: "primary.main",
            color: "white",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={600}
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Timeline />
            Transactions ({filteredTransactions.length})
          </Typography>
        </Box>
        {filteredTransactions.length === 0 ? (
          <Box p={6} textAlign="center">
            <Receipt sx={{ fontSize: 48, opacity: 0.3 }} />
            <Typography>No transactions found.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "hidden" }}>
            <Table sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ maxWidth: 80 }}>ID</TableCell>
                  <TableCell sx={{ maxWidth: 120 }}>Type</TableCell>
                  <TableCell sx={{ maxWidth: 120 }}>Amount</TableCell>
                  <TableCell sx={{ maxWidth: 120 }}>Status</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>Created By</TableCell>
                  <TableCell sx={{ maxWidth: 150 }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map((tx, index) => (
                  <Fade in={true} timeout={300 + index * 100} key={tx.id}>
                    <TableRow
                      sx={{
                        "&:nth-of-type(odd)": {
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                        },
                        "&:hover": {
                          backgroundColor: "rgba(103, 126, 234, 0.08)",
                        },
                        cursor: "pointer",
                      }}
                    >
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="primary"
                        >
                          {tx.id}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          {tx.note}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={tx.type}
                          color={tx.type === "INCREASE" ? "success" : "error"}
                          icon={
                            tx.type === "INCREASE" ? (
                              <TrendingUp />
                            ) : (
                              <TrendingDown />
                            )
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color={
                            tx.type === "INCREASE"
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {tx.type === "INCREASE" ? "+" : "-"}$
                          {Number(tx.amount).toLocaleString()}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={tx.status}
                          color={getStatusColor(tx.status)}
                          icon={getStatusIcon(tx.status)}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>

                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: 14,
                            }}
                          >
                            <CustomAvatar
                              src={fund.createdByAvatar}
                              sx={{
                                width: 32,
                                height: 32,
                                fontSize: 14,
                                bgcolor: "secondary.main",
                              }}
                            />
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {tx.createdByDisplay || tx.createdBy}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(tx.createdAt).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </Fade>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "white",
            fontWeight: 600,
            px: 3,
            py: 2,
          }}
        >
          Cập nhật Quỹ
        </DialogTitle>

        <DialogContent>
          <TextField
            label="Tên quỹ"
            fullWidth
            margin="normal"
            value={editForm.name}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <TextField
            label="Mục đích"
            fullWidth
            margin="normal"
            multiline
            value={editForm.purpose}
            onChange={(e) =>
              setEditForm((prev) => ({ ...prev, purpose: e.target.value }))
            }
          />
          <TextField
            label="Số dư"
            fullWidth
            margin="normal"
            type="number"
            value={editForm.balance}
            onChange={(e) =>
              setEditForm((prev) => ({
                ...prev,
                balance: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleUpdateFund}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{ bgcolor: "primary.main", color: "white", fontWeight: 600 }}
        >
          Lịch sử chỉnh sửa quỹ
        </DialogTitle>
        <DialogContent dividers>
          {editHistory.length === 0 ? (
            <Typography>Chưa có lịch sử chỉnh sửa.</Typography>
          ) : (
            editHistory.map((item, index) => (
              <Box
                key={index}
                mb={2}
                p={2}
                sx={{ border: "1px solid #ccc", borderRadius: 2 }}
              >
                <Typography variant="subtitle2">
                  Thời gian: {new Date(item.backedUpAt).toLocaleString()}
                </Typography>
                <Typography variant="body2">Tên: {item.name}</Typography>
                <Typography variant="body2">
                  Mục đích: {item.purpose}
                </Typography>
                <Typography variant="body2">
                  Số dư: {Number(item.balance).toLocaleString()} VND
                </Typography>
                <Typography variant="body2">
                  Người chỉnh sửa: {item.updatedBy}
                </Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHistoryOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
