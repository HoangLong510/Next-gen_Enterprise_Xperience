// src/pages/bank/BankAndTopupPage.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Pagination,
  MenuItem,
  Alert,
  Switch,
  FormControlLabel,
  Collapse,
} from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Autocomplete from "@mui/material/Autocomplete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import debounce from "lodash/debounce";

import {
  createTopupApi,
  getMyTopupsApi,
  getTopupStatusApi,
  getBankTransactionsPageApi,
  getTopupQrImageApi,
} from "~/services/bank.service";
import { searchEmployeesApi } from "~/services/project.service";

/* ------------ helpers ------------ */
const formatVND = (n) =>
  (n ?? 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const StatusChip = ({ s }) => {
  const map = {
    PENDING: { label: "Pending", color: "warning" },
    SUCCESS: { label: "Success", color: "success" },
    FAILED: { label: "Failed", color: "error" },
    CANCELED: { label: "Canceled", color: "default" },
    EXPIRED: { label: "Expired", color: "default" },
    REQUIRES_ACTION: { label: "Requires action", color: "info" },
  };
  const cfg = map[s] || { label: s, color: "default" };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

export default function BankAndTopupPage() {
  /* ------------ AUTH / ROLE ------------- */
  const account = useSelector((state) => state.account.value);
  const role = account?.role;
  const isAccountant =
    role === "ACCOUNTANT" ||
    role === "CHIEFACCOUNTANT" ||
    role === "CHIEF_ACCOUNTANT";

  /* ------------ COMMON ------------- */
  const [bankAccountNo] = useState("65609062003");
  const [bankName] = useState("TPBank");

  /* ------------ CREATE TOPUP (chỉ kế toán) ------------- */
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("");
  const [singleIntent, setSingleIntent] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef(null);

  // multi mode toggle
  const [multiMode, setMultiMode] = useState(true);

  // employees search/select
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [fetchingEmp, setFetchingEmp] = useState(false);

  // just-generated codes (multi mode)
  const [generatedList, setGeneratedList] = useState([]);

  /* ------------ TOPUPS LIST ------------- */
  const [topups, setTopups] = useState([]);
  const [topupTotalPages, setTopupTotalPages] = useState(1);
  const [topupPage, setTopupPage] = useState(1);
  const [loadingTopups, setLoadingTopups] = useState(false);

  /* ------------ BANK TX (chỉ kế toán) ------------- */
  const [txType, setTxType] = useState(""); // '', CREDIT, DEBIT
  const [from, setFrom] = useState(""); // ISO string: yyyy-MM-ddTHH:mm
  const [to, setTo] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txRows, setTxRows] = useState([]);

  /* ------------ employees: load + search ------------- */
  const loadEmployees = async (keyword = "", limit = 50) => {
    if (!isAccountant) return;
    setFetchingEmp(true);
    const res = await searchEmployeesApi(keyword, { limit });
    setFetchingEmp(false);
    setEmployeeOptions(res?.data || []);
  };

  // initial load employees (khi là kế toán)
  useEffect(() => {
    if (isAccountant) loadEmployees("", 50);
  }, [isAccountant]);

  const debouncedSearch = useMemo(
    () =>
      debounce((kw) => {
        if (!isAccountant) return;
        if (!kw || kw.trim().length === 0) {
          loadEmployees("", 50);
        } else {
          loadEmployees(kw.trim(), 20);
        }
      }, 350),
    [isAccountant]
  );
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  /* ------------ actions: create topup(s) ------------- */
  const handleCreate = async () => {
    if (!isAccountant) return;
    if (!amount || Number(amount) <= 0) return;

    const payload = {
      amount: Number(amount),
      bankAccountNo,
    };

    if (multiMode) {
      const ids = selectedEmployees.map((e) => e.id).filter(Boolean);
      if (ids.length === 0) return;
      payload.perEmployee = true;
      payload.employeeIds = ids;
      payload.copies = 1;
    } else {
      payload.perEmployee = false;
      payload.copies = 1;
    }

    setCreating(true);
    const res = await createTopupApi(payload);
    setCreating(false);

    const data = res?.data || res;

    if (Array.isArray(data?.items)) {
      if (multiMode) {
        setGeneratedList(data.items);
        setSingleIntent(null);
        setQrUrl("");
      } else if (data.items.length === 1) {
        const one = data.items[0];
        setGeneratedList([]);
        setSingleIntent(one);
        if (one?.code) startPolling(one.code);
      } else {
        setGeneratedList(data.items);
        setSingleIntent(null);
        setQrUrl("");
      }
    } else {
      setGeneratedList([]);
      setSingleIntent(data);
      if (data?.code) startPolling(data.code);
    }

    fetchTopups(topupPage);
  };

  /* ------------ polling for single code ------------- */
  const startPolling = (code) => {
    stopPolling();
    setPolling(true);
    pollTimer.current = setInterval(async () => {
      const r = await getTopupStatusApi(code);
      const payload = r.data || r;
      setSingleIntent((old) => ({ ...(old || {}), ...(payload || {}) }));
      const status = payload?.status;
      if (status && status !== "PENDING" && status !== "REQUIRES_ACTION") {
        stopPolling();
        fetchTopups(topupPage);
      }
    }, 4000);
  };
  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setPolling(false);
  };
  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (singleIntent?.code) {
      (async () => {
        const r = await getTopupQrImageApi(singleIntent.code);
        const payload = r?.data || r;
        setQrUrl(payload?.qrImageUrl || "");
      })();
    }
  }, [singleIntent?.code]);

  /* ------------ topups list------------- */
  const fetchTopups = async (page = 1) => {
    setLoadingTopups(true);
    const scope = isAccountant ? "created" : "owner";
    const res = await getMyTopupsApi({ page, size: 10, scope });
    setLoadingTopups(false);

    const content = res?.data?.content || res?.data || [];
    const totalPage = res?.data?.totalPages || 1;
    setTopups(content);
    setTopupTotalPages(totalPage);
  };

  // lần đầu + khi role đổi
  useEffect(() => {
    fetchTopups(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccountant]);

  /* ------------ bank transactions (chỉ kế toán) ------------- */
  const fetchBankTx = async (page = 1) => {
    if (!isAccountant) return;
    setTxLoading(true);
    const filter = { page, size: 15 };
    if (txType) filter.type = txType;
    if (from) filter.from = from;
    if (to) filter.to = to;

    const res = await getBankTransactionsPageApi(filter);
    setTxLoading(false);

    const pageObj = res?.data || res;
    setTxRows(pageObj?.content || []);
    setTxTotalPages(pageObj?.totalPages ?? 1);
  };
  useEffect(() => {
    if (isAccountant) fetchBankTx(1);
  }, [isAccountant]);

  /* ------------ render ------------ */
  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Bank & Top-up
      </Typography>

      {/* CREATE TOPUP: chỉ dành cho kế toán */}
      {isAccountant && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="h6" fontWeight={600}>
              Top-up (Bank transfer)
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={multiMode}
                  onChange={(_, v) => {
                    setMultiMode(v);
                    // reset UI state
                    setSingleIntent(null);
                    setGeneratedList([]);
                    setQrUrl("");
                    stopPolling();
                  }}
                />
              }
              label="One code per person"
            />
          </Stack>

          <Typography variant="body2" color="text.secondary" mb={2}>
            Create a “top-up intent” to receive a{" "}
            <strong>unique transfer content/code</strong>. When the bank
            transfer with this code arrives, the system will auto-confirm it.
          </Typography>

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3.5}>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                size="small"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 100000"
              />
            </Grid>

            <Grid item xs={12} md={3.5}>
              <TextField
                label="Receiving Account No."
                fullWidth
                size="small"
                value={bankAccountNo}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                label="Bank"
                fullWidth
                size="small"
                value={bankName}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>

            {/* MULTI MODE: employee picker */}
            <Grid item xs={12} md={9}>
              <Collapse in={multiMode} unmountOnExit>
                <Autocomplete
                  multiple
                  options={employeeOptions}
                  value={selectedEmployees}
                  onChange={(_, v) => setSelectedEmployees(v)}
                  loading={fetchingEmp}
                  getOptionLabel={(o) =>
                    `${o.firstName || ""} ${o.lastName || ""}`.trim()
                  }
                  filterSelectedOptions
                  sx={{ width: 720 }}
                  onOpen={() => {
                    if (employeeOptions.length === 0) loadEmployees("", 50);
                  }}
                  onInputChange={(_, v) => debouncedSearch(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Pick employees"
                      placeholder="Search by name / phone / email"
                    />
                  )}
                  slotProps={{
                    popper: { sx: { minWidth: 720 } },
                    paper: { sx: { minWidth: 720 } },
                  }}
                  ListboxProps={{
                    sx: { maxHeight: 420, overflowY: "auto" },
                  }}
                  renderOption={(props, option) => (
                    <li
                      {...props}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 8,
                      }}
                    >
                      <Avatar
                        src={option.avatar || ""}
                        sx={{ width: 32, height: 32 }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {(option.firstName || "") +
                            " " +
                            (option.lastName || "")}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {option.email || option.phone || "—"}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderTags={(value, getTagProps) => {
                    if (value.length > 3) {
                      const displayed = value.slice(0, 2);
                      return [
                        ...displayed.map((option, index) => {
                          const { key, ...tagProps } = getTagProps({ index });
                          return (
                            <Chip
                              key={key}
                              label={`${option.firstName} ${option.lastName}`}
                              {...tagProps}
                            />
                          );
                        }),
                        <Chip
                          key="more"
                          label={`+${value.length - displayed.length} more`}
                          sx={{ bgcolor: "grey.200" }}
                        />,
                      ];
                    }

                    return value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={`${option.firstName} ${option.lastName}`}
                          {...tagProps}
                        />
                      );
                    });
                  }}
                />
              </Collapse>
            </Grid>

            <Grid item xs={12} md={multiMode ? 3 : 4.5}>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={
                  creating ||
                  !amount ||
                  (multiMode && selectedEmployees.length === 0)
                }
                startIcon={creating ? <AutorenewIcon /> : null}
                fullWidth
              >
                {multiMode ? "Generate codes for selected" : "Generate my code"}
              </Button>
            </Grid>
          </Grid>

          {/* RESULT: single mode */}
          {singleIntent && (
            <Box mt={3}>
              <Alert
                severity={
                  singleIntent.status === "SUCCESS" ? "success" : "info"
                }
                sx={{ mb: 2 }}
              >
                Status: <b>{singleIntent.status}</b>{" "}
                {polling && <>• polling…</>}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                    <Stack spacing={1}>
                      <Row label="Transfer content/code">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            fontWeight={700}
                            sx={{ wordBreak: "break-all" }}
                          >
                            {singleIntent?.code}
                          </Typography>
                          <Tooltip title="Copy">
                            <IconButton
                              size="small"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  singleIntent?.code || ""
                                )
                              }
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Row>
                      <Row label="Amount">{formatVND(singleIntent.amount)}</Row>
                      <Row label="Receiving account">
                        {singleIntent.bankAccountNo || bankAccountNo}
                      </Row>
                      <Row label="Completed at">
                        {singleIntent.completedAt
                          ? new Date(singleIntent.completedAt).toLocaleString()
                          : "-"}
                      </Row>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                    <Typography fontWeight={600} mb={1}>
                      Scan VietQR
                    </Typography>
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt="VietQR"
                        style={{
                          width: 220,
                          height: 220,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <Typography color="text.secondary">
                        Generating QR…
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      QR includes amount & content: <b>{singleIntent.code}</b>
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* RESULT: multi mode list */}
          {multiMode && generatedList.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Generated codes
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Bank account</TableCell>
                      <TableCell>QR</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generatedList.map((it, idx) => (
                      <GeneratedRow key={it.id || it.code || idx} it={it} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Alert severity="info" sx={{ mt: 1 }}>
                Each employee received a unique transfer content/code. When the
                bank transfer arrives with the correct code, it will be
                confirmed automatically.
              </Alert>
            </Box>
          )}
        </Paper>
      )}

      {/* TOPUPS: tuỳ role đổi tiêu đề & nguồn dữ liệu */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          {isAccountant ? "Fund top-up history" : "My top-up history"}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Code</TableCell>
                {isAccountant && <TableCell>Owner</TableCell>}
                <TableCell>Amount</TableCell>
                <TableCell>Receiving account</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Completed at</TableCell>
                <TableCell>Created at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topups.map((t, idx) => {
                const ownerName = [t?.owner?.firstName, t?.owner?.lastName]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <TableRow key={t.id || idx}>
                    <TableCell>{(topupPage - 1) * 10 + idx + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 240, wordBreak: "break-all" }}>
                      {t.code}
                    </TableCell>

                    {isAccountant && (
                      <TableCell
                        sx={{
                          maxWidth: 220,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={ownerName}
                      >
                        {ownerName || "—"}
                      </TableCell>
                    )}

                    <TableCell>{formatVND(t.amount)}</TableCell>
                    <TableCell>{t.bankAccountNo || "-"}</TableCell>
                    <TableCell>
                      <StatusChip s={t.status} />
                    </TableCell>
                    <TableCell>
                      {t.completedAt
                        ? new Date(t.completedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" justifyContent="center" mt={2}>
          <Pagination
            page={topupPage}
            count={topupTotalPages}
            onChange={(_, p) => {
              setTopupPage(p);
              fetchTopups(p);
            }}
            size="small"
          />
        </Stack>
      </Paper>

      {/* BANK TRANSACTIONS: chỉ kế toán */}
      {isAccountant && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Bank transactions
          </Typography>

          <Grid container spacing={2} alignItems="center" mb={1}>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Type"
                select
                fullWidth
                size="small"
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CREDIT">Credit (in)</MenuItem>
                <MenuItem value="DEBIT">Debit (out)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="From"
                type="datetime-local"
                fullWidth
                size="small"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="To"
                type="datetime-local"
                fullWidth
                size="small"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setTxPage(1);
                  fetchBankTx(1);
                }}
                startIcon={<AutorenewIcon />}
              >
                Filter / Refresh
              </Button>
            </Grid>
          </Grid>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Ref Id</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Counter acct</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress size={22} />
                    </TableCell>
                  </TableRow>
                ) : txRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No transactions
                    </TableCell>
                  </TableRow>
                ) : (
                  txRows.map((r, idx) => (
                    <TableRow key={r.id || idx}>
                      <TableCell>{(txPage - 1) * 15 + idx + 1}</TableCell>
                      <TableCell sx={{ maxWidth: 180, wordBreak: "break-all" }}>
                        {r.refId}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={r.type === "CREDIT" ? "success" : "default"}
                          label={r.type}
                        />
                      </TableCell>
                      <TableCell>{formatVND(r.amount)}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 260,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.description}
                      </TableCell>
                      <TableCell>{r.counterAccountNo || "-"}</TableCell>
                      <TableCell>
                        {r.txTime ? new Date(r.txTime).toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" justifyContent="center" mt={2}>
            <Pagination
              page={txPage}
              count={txTotalPages}
              onChange={(_, p) => {
                setTxPage(p);
                fetchBankTx(p);
              }}
              size="small"
            />
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

/* ---------- small components ---------- */
function Row({ label, children }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography color="text.secondary" minWidth={170}>
        {label}
      </Typography>
      <Typography sx={{ wordBreak: "break-all" }}>{children}</Typography>
    </Stack>
  );
}

function GeneratedRow({ it }) {
  const [qr, setQr] = useState("");
  const [open, setOpen] = useState(false);

  const loadQr = async () => {
    if (qr) return setOpen((v) => !v);
    const r = await getTopupQrImageApi(it.code);
    const payload = r?.data || r;
    setQr(payload?.qrImageUrl || "");
    setOpen(true);
  };

  const name = (it?.owner?.firstName || "") + " " + (it?.owner?.lastName || "");

  return (
    <>
      <TableRow>
        <TableCell>{it.seq || "-"}</TableCell>
        <TableCell
          sx={{
            maxWidth: 260,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name || "—"}
        </TableCell>
        <TableCell sx={{ maxWidth: 240, wordBreak: "break-all" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <span>{it.code}</span>
            <Tooltip title="Copy">
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(it.code || "")}
              >
                <ContentCopyIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
        <TableCell>{formatVND(it.amount)}</TableCell>
        <TableCell>{it.bankAccountNo || "—"}</TableCell>
        <TableCell>
          <Button
            variant="text"
            size="small"
            startIcon={<QrCode2Icon />}
            onClick={loadQr}
          >
            QR
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={open}>
            <Box display="flex" justifyContent="center" py={2}>
              {qr ? (
                <img
                  src={qr}
                  alt="VietQR"
                  style={{ width: 200, height: 200, objectFit: "contain" }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Generating QR…
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
