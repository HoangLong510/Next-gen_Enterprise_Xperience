"use client"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  IconButton,
  Collapse,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Divider,
} from "@mui/material"
import {
  Search,
  FilterList,
  Refresh,
  ArrowBack,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Schedule,
  GetApp,
  ExpandMore,
  ExpandLess,
  Clear,
} from "@mui/icons-material"
import CustomAvatar from "~/components/custom-avatar"
import { getAllTransactionsApi, approveTransactionApi } from "~/services/accountant/fund.service"

export default function TransactionList() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  })

  const [filters, setFilters] = useState({
    type: "",
    status: "",
    createdFrom: "",
    createdTo: "",
    createdBy: "",
    fundName: "",
    amountMin: "",
    amountMax: "",
    search: "",
  })
  const dispatch = useDispatch()

  const fetchData = async () => {
    setLoading(true)
    const params = {}
    Object.keys(filters).forEach((key) => {
      if (filters[key]) params[key] = filters[key]
    })

    const res = await getAllTransactionsApi(params)
    if (res?.status === 200 && Array.isArray(res.data)) {
      setTransactions(res.data)
    } else {
      setTransactions([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  const handleResetFilters = () => {
    setFilters({
      type: "",
      status: "",
      createdFrom: "",
      createdTo: "",
      createdBy: "",
      fundName: "",
      amountMin: "",
      amountMax: "",
      search: "",
    })
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleApproveReject = async (transaction, approve) => {
    const confirm = window.confirm(`Are you sure you want to ${approve ? "approve" : "reject"} this transaction?`)
    if (!confirm) return

    setActionLoadingId(transaction.id)
    const res = await approveTransactionApi(transaction.fundId, transaction.id, approve, "")

    setActionLoadingId(null)

    if (res?.status === 200) {
      setSnackbar({
        open: true,
        message: `Transaction ${approve ? "approved" : "rejected"} successfully.`,
        severity: "success",
      })
      fetchData()
    } else {
      setSnackbar({
        open: true,
        message: res.message || "Action failed",
        severity: "error",
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "success"
      case "PENDING":
        return "warning"
      case "REJECTED":
        return "error"
      default:
        return "default"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle sx={{ fontSize: 16 }} />
      case "PENDING":
        return <Schedule sx={{ fontSize: 16 }} />
      case "REJECTED":
        return <Cancel sx={{ fontSize: 16 }} />
      default:
        return null
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                }}
              >
                <ArrowBack />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Transactions
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  Manage all fund transactions
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchData}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Filter Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{ cursor: "pointer" }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList />
              <Typography variant="h6">Filters</Typography>
            </Box>
            <IconButton>{showFilters ? <ExpandLess /> : <ExpandMore />}</IconButton>
          </Box>

          <Collapse in={showFilters}>
            <Box sx={{ mt: 3 }}>
              {/* Search Bar */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    placeholder="Search transactions..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              {/* Filter Controls */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Transaction Type */}
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Transaction Type</InputLabel>
                    <Select
                      value={filters.type}
                      label="Transaction Type"
                      onChange={(e) => handleFilterChange("type", e.target.value)}
                    >
                      <MenuItem value="">All Types</MenuItem>
                      <MenuItem value="INCREASE">Increase</MenuItem>
                      <MenuItem value="DECREASE">Decrease</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Status */}
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      label="Status"
                      onChange={(e) => handleFilterChange("status", e.target.value)}
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="APPROVED">Approved</MenuItem>
                      <MenuItem value="REJECTED">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Fund Name */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Fund Name"
                    value={filters.fundName}
                    onChange={(e) => handleFilterChange("fundName", e.target.value)}
                    placeholder="Enter fund name"
                  />
                </Grid>

                {/* Created By */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Created By"
                    value={filters.createdBy}
                    onChange={(e) => handleFilterChange("createdBy", e.target.value)}
                    placeholder="Enter creator name"
                  />
                </Grid>
              </Grid>

              {/* Date and Amount Range */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Date From */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Created From"
                    type="date"
                    value={filters.createdFrom}
                    onChange={(e) => handleFilterChange("createdFrom", e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                {/* Date To */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Created To"
                    type="date"
                    value={filters.createdTo}
                    onChange={(e) => handleFilterChange("createdTo", e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                {/* Amount Min */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Min Amount"
                    type="number"
                    value={filters.amountMin}
                    onChange={(e) => handleFilterChange("amountMin", e.target.value)}
                    placeholder="0"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>

                {/* Amount Max */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Max Amount"
                    type="number"
                    value={filters.amountMax}
                    onChange={(e) => handleFilterChange("amountMax", e.target.value)}
                    placeholder="999999"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Filter Actions */}
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={handleResetFilters}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                >
                  Reset Filters
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={fetchData}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
                  }}
                >
                  Apply Filters
                </Button>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <Box p={5} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Note</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Created By</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Created At</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Approved By</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Approved At</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Approval Comment</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "grey.50" }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow
                    key={t.id}
                    sx={{
                      "&:hover": {
                        bgcolor: "grey.50",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {t.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.type}
                        color={t.type === "INCREASE" ? "success" : "error"}
                        icon={t.type === "INCREASE" ? <TrendingUp /> : <TrendingDown />}
                        sx={{ borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        ${t.amount?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {t.note ? (
                        <Typography variant="body2">{t.note}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          -
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={t.status}
                        color={getStatusColor(t.status)}
                        icon={getStatusIcon(t.status)}
                        sx={{ borderRadius: 2 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CustomAvatar
                          src={t.createdByAvatar}
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            bgcolor: "primary.main",
                          }}
                        >
                          {(!t.createdByAvatar && (t.createdByDisplay || t.createdBy)?.charAt(0)) || ""}
                        </CustomAvatar>
                        <Typography variant="body2" fontWeight={500}>
                          {t.createdByDisplay || t.createdBy}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      {t.createdAt ? (
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {new Date(t.createdAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(t.createdAt).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {t.approvedBy ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <CustomAvatar
                            src={t.approvedByAvatar}
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: 14,
                              bgcolor: "secondary.main",
                            }}
                          >
                            {(!t.approvedByAvatar && t.approvedByDisplay?.charAt(0)) || ""}
                          </CustomAvatar>
                          <Typography variant="body2" fontWeight={500}>
                            {t.approvedByDisplay}
                          </Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell>
                      {t.approvedAt ? (
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {new Date(t.approvedAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(t.approvedAt).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{t.approvalComment || "-"}</Typography>
                    </TableCell>
                    <TableCell>
                      {t.fileUrl ? (
                        <IconButton
                          href={`/${t.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: "primary.main",
                            "&:hover": {
                              bgcolor: "primary.light",
                              color: "white",
                            },
                          }}
                        >
                          <GetApp />
                        </IconButton>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {t.status === "PENDING" ? (
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={actionLoadingId === t.id}
                            onClick={() => handleApproveReject(t, true)}
                            sx={{
                              borderRadius: 2,
                              textTransform: "none",
                              minWidth: 80,
                            }}
                          >
                            {actionLoadingId === t.id && <CircularProgress size={16} sx={{ mr: 1 }} />}
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={actionLoadingId === t.id}
                            onClick={() => handleApproveReject(t, false)}
                            sx={{
                              borderRadius: 2,
                              textTransform: "none",
                              minWidth: 80,
                            }}
                          >
                            {actionLoadingId === t.id && <CircularProgress size={16} sx={{ mr: 1 }} />}
                            Reject
                          </Button>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
