import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "@mui/material/styles";
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
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";

import {
  createFundApi,
  getFundsApi,
  lockFundApi,
  unlockFundApi,
  getFundLogsApi,
  createTransactionApi,
} from "~/services/accountant/fund.service";

export default function FundList({ accessToken }) {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 1,
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [newFund, setNewFund] = useState({
    name: "",
    balance: "",
    purpose: "",
  });
  const [statusLogDialog, setStatusLogDialog] = useState({
    open: false,
    logs: [],
    fundId: null,
  });
  const [lockDialog, setLockDialog] = useState({
    open: false,
    fundId: null,
    action: "LOCK",
    reason: "",
    file: null,
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
  const [statusLogFilters, setStatusLogFilters] = useState({
    updatedBy: "",
    fromDate: "",
    toDate: "",
    newStatus: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchFunds();
  }, [filters, currentPage, pageSize]);

  const fetchFunds = async () => {
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

  const fetchStatusLogs = async (fundId, filters = {}) => {
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== "")
    );

    const res = await getFundLogsApi(fundId, accessToken, cleanedFilters);
    setStatusLogDialog({
      open: true,
      logs: res?.status === 200 ? res.data : [],
      fundId,
    });
  };

  useEffect(() => {
    if (statusLogDialog.open && statusLogDialog.fundId) {
      fetchStatusLogs(statusLogDialog.fundId, statusLogFilters);
    }
  }, [
    statusLogFilters,
    statusLogDialog.open,
    statusLogDialog.fundId,
    statusLogDialog.newStatus,
  ]);

  const handleCreate = async () => {
    const res = await createFundApi(
      {
        name: newFund.name,
        balance: parseFloat(newFund.balance),
        purpose: newFund.purpose,
      },
      accessToken
    );
    if (res?.status === 201) {
      setOpenCreate(false);
      setNewFund({ name: "", balance: "", purpose: "" });
      fetchFunds();
    }
  };

  const submitLockUnlock = async () => {
    const formData = new FormData();
    formData.append("reason", lockDialog.reason);
    if (lockDialog.file) {
      formData.append("file", lockDialog.file);
    }

    let res;
    if (lockDialog.action === "LOCK") {
      res = await lockFundApi(lockDialog.fundId, formData, accessToken);
    } else {
      res = await unlockFundApi(lockDialog.fundId, formData, accessToken);
    }

    if (res?.status === 200) {
      setLockDialog({ ...lockDialog, open: false });
      fetchFunds();
    }
  };
  const handleCreateTransaction = async () => {
    const formData = new FormData();
    formData.append("amount", transactionDialog.amount);
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
      fetchFunds();
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Fund Management
      </Typography>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          sx={{ mb: 2 }}
          onClick={() => setOpenCreate(true)}
        >
          + Create New Fund
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setFilters({
              name: "",
              status: "",
              createdAfter: "",
              createdBefore: "",
              balanceMin: "",
              balanceMax: "",
            });
          }}
          sx={{
            mb: 2,
            ":hover": {
              backgroundColor: "primary.main",
              color: "#fff",
              borderColor: "primary.main",
            },
          }}
        >
          Reset
        </Button>
      </Box>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          label="Name"
          variant="outlined"
          size="small"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <TextField
          label="Status"
          variant="outlined"
          size="small"
          select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="LOCKED">Locked</MenuItem>
        </TextField>
        <TextField
          label="Created After"
          type="datetime-local"
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.createdAfter}
          onChange={(e) =>
            setFilters({ ...filters, createdAfter: e.target.value })
          }
        />
        <TextField
          label="Created Before"
          type="datetime-local"
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.createdBefore}
          onChange={(e) =>
            setFilters({ ...filters, createdBefore: e.target.value })
          }
        />
        <TextField
          label="Balance Min"
          type="number"
          variant="outlined"
          size="small"
          value={filters.balanceMin}
          onChange={(e) =>
            setFilters({ ...filters, balanceMin: e.target.value })
          }
        />
        <TextField
          label="Balance Max"
          type="number"
          variant="outlined"
          size="small"
          value={filters.balanceMax}
          onChange={(e) =>
            setFilters({ ...filters, balanceMax: e.target.value })
          }
        />
        <TextField
          label="Rows per page"
          type="number"
          size="small"
          value={pageSize}
          onChange={(e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val <= 0) {
              val = 1;
            }
            setPageSize(val);
            setCurrentPage(0);
          }}
          inputProps={{
            min: 1,
            step: 1,
            style: { width: 80 },
          }}
        />
      </Box>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <b>#</b>
                </TableCell>
                <TableCell>
                  <b>Name</b>
                </TableCell>
                <TableCell>
                  <b>Balance</b>
                </TableCell>
                <TableCell>
                  <b>Status</b>
                </TableCell>
                <TableCell>
                  <b>Purpose</b>
                </TableCell>
                <TableCell>
                  <b>Created By</b>
                </TableCell>
                <TableCell>
                  <b>Created At</b>
                </TableCell>
                <TableCell>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {funds.length > 0 ? (
                funds.map((fund) => (
                  <TableRow
                    key={fund.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => fund.id && navigate(`${fund.id}`)}
                  >
                    <TableCell>{fund.id}</TableCell>
                    <TableCell>{fund.name}</TableCell>
                    <TableCell>{fund.balance?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={fund.status}
                        color={fund.status === "ACTIVE" ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>{fund.purpose}</TableCell>
                    <TableCell>{fund.createdBy}</TableCell>
                    <TableCell>
                      {fund.createdAt
                        ? new Date(fund.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {fund.status === "ACTIVE" ? (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<LockIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLockDialog({
                                open: true,
                                fundId: fund.id,
                                action: "LOCK",
                                reason: "",
                                file: null,
                              });
                            }}
                            sx={{
                              ":hover": {
                                backgroundColor: "error.main",
                                color: "#fff",
                                borderColor: "error.main",
                              },
                            }}
                          >
                            Lock
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            color="success"
                            size="small"
                            startIcon={<LockOpenIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLockDialog({
                                open: true,
                                fundId: fund.id,
                                action: "UNLOCK",
                                reason: "",
                                file: null,
                              });
                            }}
                            sx={{
                              ":hover": {
                                backgroundColor: "success.main",
                                color: "#fff",
                                borderColor: "success.main",
                              },
                            }}
                          >
                            Unlock
                          </Button>
                        )}

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddCircleOutlineIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
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
                            ":hover": {
                              backgroundColor: "primary.main",
                              color: "#fff",
                              borderColor: "primary.main",
                            },
                          }}
                        >
                          New Transaction
                        </Button>

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<HistoryIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchStatusLogs(fund.id);
                          }}
                          sx={{
                            ":hover": {
                              backgroundColor: "info.main",
                              color: "#fff",
                              borderColor: "info.main",
                            },
                          }}
                        >
                          View Logs
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No data available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box mt={2} display="flex" justifyContent="center">
        <Pagination
          count={pagination.totalPages}
          page={pagination.currentPage + 1}
          onChange={(e, value) => setCurrentPage(value - 1)}
          color="primary"
        />
      </Box>
      {/* Create Fund Dialog */}
      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Fund</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
            gap: 2,
            mt: 1,
          }}
        >
          <TextField
            label="Name"
            value={newFund.name}
            onChange={(e) => setNewFund({ ...newFund, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Initial Balance"
            type="number"
            value={newFund.balance}
            onChange={(e) =>
              setNewFund({ ...newFund, balance: e.target.value })
            }
            fullWidth
          />
          <TextField
            label="Purpose"
            value={newFund.purpose}
            onChange={(e) =>
              setNewFund({ ...newFund, purpose: e.target.value })
            }
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lock/Unlock Dialog */}
      <Dialog
        open={lockDialog.open}
        onClose={() => setLockDialog({ ...lockDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {lockDialog.action === "LOCK" ? "Lock Fund" : "Unlock Fund"}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
            gap: 2,
            mt: 2,
          }}
        >
          <TextField
            label="Reason"
            variant="outlined"
            value={lockDialog.reason}
            onChange={(e) =>
              setLockDialog({ ...lockDialog, reason: e.target.value })
            }
            fullWidth
          />
          <Button variant="outlined" component="label">
            {lockDialog.file ? "Change File" : "Upload File"}
            <input
              type="file"
              hidden
              onChange={(e) => {
                const file = e.target.files[0];
                setLockDialog({ ...lockDialog, file });
              }}
            />
          </Button>
          {lockDialog.file && (
            <Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {lockDialog.file.name}
              </Typography>
              {lockDialog.file.type.startsWith("image/") && (
                <Box
                  component="img"
                  src={URL.createObjectURL(lockDialog.file)}
                  alt="preview"
                  sx={{
                    mt: 1,
                    maxWidth: "100%",
                    maxHeight: 200,
                    border: "1px solid #ccc",
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockDialog({ ...lockDialog, open: false })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitLockUnlock}
            disabled={!lockDialog.reason.trim()}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Logs Dialog */}
      <Dialog
        open={statusLogDialog.open}
        onClose={() => setStatusLogDialog({ ...statusLogDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Status Change History</DialogTitle>

        <DialogContent sx={{ overflow: "visible" }}>
          <Box>
            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              <TextField
                label="Updated By"
                size="small"
                value={statusLogFilters.updatedBy}
                onChange={(e) =>
                  setStatusLogFilters({
                    ...statusLogFilters,
                    updatedBy: e.target.value,
                  })
                }
              />
              <TextField
                label="New Status"
                select
                size="small"
                value={statusLogFilters.newStatus}
                onChange={(e) =>
                  setStatusLogFilters({
                    ...statusLogFilters,
                    newStatus: e.target.value,
                  })
                }
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="LOCKED">Locked</MenuItem>
              </TextField>
              <TextField
                label="From Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={statusLogFilters.fromDate}
                onChange={(e) =>
                  setStatusLogFilters({
                    ...statusLogFilters,
                    fromDate: e.target.value,
                  })
                }
              />
              <TextField
                label="To Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={statusLogFilters.toDate}
                onChange={(e) =>
                  setStatusLogFilters({
                    ...statusLogFilters,
                    toDate: e.target.value,
                  })
                }
              />
            </Box>
          </Box>
          {statusLogDialog.logs.length === 0 ? (
            <Typography>No status logs available.</Typography>
          ) : (
            <Table size="small" sx={{ minWidth: "100%" }}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <b>Time</b>
                  </TableCell>
                  <TableCell>
                    <b>Old Status</b>
                  </TableCell>
                  <TableCell>
                    <b>New Status</b>
                  </TableCell>
                  <TableCell>
                    <b>Reason</b>
                  </TableCell>
                  <TableCell>
                    <b>Attachment</b>
                  </TableCell>
                  <TableCell>
                    <b>Updated By</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statusLogDialog.logs.map((log, index) => {
                  const fileUrl = log.fileUrl
                    ? `http://localhost:5173${log.fileUrl}`
                    : null;
                  const isImage = fileUrl
                    ? /\.(jpe?g|png|gif)$/i.test(fileUrl)
                    : false;

                  return (
                    <TableRow
                      key={log.id}
                      sx={{
                        backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                      }}
                    >
                      <TableCell>
                        {log.updatedAt
                          ? new Date(log.updatedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.oldStatus}
                          color={
                            log.oldStatus === "ACTIVE" ? "success" : "default"
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.newStatus}
                          color={
                            log.newStatus === "ACTIVE" ? "success" : "default"
                          }
                          size="small"
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>{log.reason}</TableCell>
                      <TableCell>
                        {log.fileUrl &&
                        log.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={`http://localhost:4040/api${log.fileUrl}`}
                            alt={log.fileName}
                            style={{
                              maxWidth: 100,
                              borderRadius: 4,
                              cursor: "pointer",
                              boxShadow: "0 0 4px rgba(0,0,0,0.2)",
                            }}
                            onClick={() =>
                              setSelectedImage(
                                `http://localhost:4040/api${log.fileUrl}`
                              )
                            }
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{log.updatedBy}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setStatusLogDialog({ ...statusLogDialog, open: false })
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview Image</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 8,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedImage(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Create New Transaction */}
      <Dialog
        open={transactionDialog.open}
        onClose={() =>
          setTransactionDialog({ ...transactionDialog, open: false })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Transaction</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            overflow: "visible",
            gap: 2,
            mt: 1,
          }}
        >
          <TextField
            label="Amount"
            type="number"
            value={transactionDialog.amount}
            onChange={(e) =>
              setTransactionDialog({
                ...transactionDialog,
                amount: e.target.value,
              })
            }
            fullWidth
          />
          <TextField
            select
            label="Type"
            SelectProps={{ native: true }}
            value={transactionDialog.type}
            onChange={(e) =>
              setTransactionDialog({
                ...transactionDialog,
                type: e.target.value,
              })
            }
            fullWidth
          >
            <option value="INCREASE">INCREASE</option>
            <option value="DECREASE">DECREASE</option>
          </TextField>
          <TextField
            label="Note"
            value={transactionDialog.note}
            onChange={(e) =>
              setTransactionDialog({
                ...transactionDialog,
                note: e.target.value,
              })
            }
            fullWidth
          />
          <Button variant="outlined" component="label">
            {transactionDialog.file ? "Change File" : "Upload File"}
            <input
              type="file"
              hidden
              onChange={(e) => {
                const file = e.target.files[0];
                setTransactionDialog({ ...transactionDialog, file });
              }}
            />
          </Button>
          {transactionDialog.file && (
            <Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {transactionDialog.file.name}
              </Typography>
              {transactionDialog.file.type.startsWith("image/") && (
                <Box
                  component="img"
                  src={URL.createObjectURL(transactionDialog.file)}
                  alt="preview"
                  sx={{
                    mt: 1,
                    maxWidth: "100%",
                    maxHeight: 200,
                    border: "1px solid #ccc",
                    borderRadius: 2,
                  }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setTransactionDialog({ ...transactionDialog, open: false })
            }
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTransaction}
            disabled={!transactionDialog.amount}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
