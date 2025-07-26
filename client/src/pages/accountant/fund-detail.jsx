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
} from "~/services/accountant/fund.service";
import CustomAvatar from "~/components/custom-avatar";

export default function FundDetails() {
  const { fundID } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Filter states
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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
        tx.createdByDisplay?.toLowerCase().includes(filterKeyword.toLowerCase());
      const typeMatch = filterType ? tx.type === filterType : true;
      const statusMatch = filterStatus ? tx.status === filterStatus : true;
      return keywordMatch && typeMatch && statusMatch;
    });
  }, [transactions, filterKeyword, filterType, filterStatus]);

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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
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
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchData}
            >
              Refresh
            </Button>
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
              <Box display="flex" alignItems="center" justifyContent="space-between">
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
        <Grid size={{xs:12, sm:4, md:3}} >
          <TextField
            label="Search"
            fullWidth
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
          />
        </Grid>
        <Grid  size={{xs:12, sm:4, md:3}}>
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
        <Grid  size={{xs:12, sm:4, md:3}}>
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
        <Grid  size={{xs:12, sm:4, md:3}}>
          <Button
            fullWidth
            startIcon={<Clear />}
            onClick={clearFilters}
            variant="outlined"
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
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
            <Table tableLayout="fixed">
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
                {transactions.map((tx, index) => (
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
                        <Typography variant="body2" fontWeight={600} color="primary">
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
                            tx.type === "INCREASE" ? "success.main" : "error.main"
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
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
    </Box>
  );
}
