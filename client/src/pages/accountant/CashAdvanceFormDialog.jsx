import React, { useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import SignatureCanvas from "react-signature-canvas";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import { getAccountFullNameAndTitle, numToWords } from "~/utils/money";
import { createCashAdvanceApi } from "~/services/cash-advance.service";
import { translateReason } from "~/utils/translateApi";
import { setPopup } from "~/libs/features/popup/popupSlice";

export default function CashAdvanceDialog({
  open,
  onClose,
  advanceOptions = [],
  onSuccess,
  withTask = true, // ✅ thêm prop để toggle
}) {
  const dispatch = useDispatch();
  const account = useSelector((s) => s.account?.value);

  const [advanceTask, setAdvanceTask] = useState(null);
  const [recipient, setRecipient] = useState(
    "Board of Directors of Next-Gen Enterprise Experience Company"
  );
  const [advanceDeadline, setAdvanceDeadline] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceBusy, setAdvanceBusy] = useState(false);
  const [advanceError, setAdvanceError] = useState("");
  const sigRef = useRef(null);

  const resetForm = () => {
    setAdvanceTask(null);
    setAdvanceAmount("");
    setAdvanceReason("");
    setAdvanceDeadline(null);
    setAdvanceError("");
    setRecipient(
      "Board of Directors of Next-Gen Enterprise Experience Company"
    );
    sigRef?.current?.clear();
  };

  function trimCanvasSafe(src) {
    if (!src) return null;
    const ctx = src.getContext("2d");
    const { width: w, height: h } = src;
    const data = ctx.getImageData(0, 0, w, h).data;

    let top = h,
      left = w,
      right = 0,
      bottom = 0,
      hasInk = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3]; // kênh alpha
        if (a !== 0) {
          hasInk = true;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    if (!hasInk) return null;

    const tw = right - left + 1;
    const th = bottom - top + 1;

    const out = document.createElement("canvas");
    out.width = tw;
    out.height = th;
    const octx = out.getContext("2d");
    octx.putImageData(ctx.getImageData(left, top, tw, th), 0, 0);
    return out;
  }

  function getSignatureDataUrl(sigRef) {
    const base = sigRef?.current?.getCanvas?.();
    if (!base) return null;
    const trimmed = trimCanvasSafe(base);
    return (trimmed || base).toDataURL("image/png");
  }

  const handleSubmit = async () => {
    try {
      const amountNum = Number(advanceAmount || 0);
      if (!amountNum || amountNum <= 0)
        return setAdvanceError("Advance amount must be > 0.");
      if (!advanceReason?.trim())
        return setAdvanceError("Reason for advance is required.");
      if (!advanceDeadline)
        return setAdvanceError("Please choose a payment term.");
      if (!sigRef?.current || sigRef.current.isEmpty())
        return setAdvanceError("Please sign in the signature box.");

      setAdvanceBusy(true);
      setAdvanceError("");

      const signatureDataUrl = getSignatureDataUrl(sigRef);
      if (!signatureDataUrl) {
        setAdvanceError("Could not get signature. Please re-sign.");
        return;
      }

      const translatedReason = await translateReason(advanceReason.trim());
      const formattedDeadline = dayjs(advanceDeadline).format(
        "[ngày] DD [tháng] MM [năm] YYYY"
      );

      const payload = {
        // ✅ chỉ gửi taskId khi withTask bật
        ...(withTask && advanceTask?.id ? { taskId: advanceTask.id } : {}),
        unitName: "Công ty Cổ phần Trải nghiệm Doanh nghiệp Next-Gen",
        departmentOrAddress: "181 Cao Thắng, Phường 12, Quận 10, TP.HCM",
        recipient,
        amount: amountNum,
        amountText: numToWords(amountNum),
        reason: translatedReason,
        repaymentDeadlineStr: formattedDeadline,
        signatureDataUrl,
      };

      const res = await createCashAdvanceApi(payload);
      if (res?.status !== 200) {
        setAdvanceError(res?.message || "Sending proposal failed.");
        return;
      }

      resetForm();
      onClose();
      if (onSuccess) await onSuccess();
      dispatch(
        setPopup({
          type: "success",
          message: "The advance request has been sent.",
        })
      );
    } catch (e) {
      console.error(e);
      setAdvanceError("There was an error sending. Please try again.");
    } finally {
      setAdvanceBusy(false);
    }
  };

  const { fullName, title } = getAccountFullNameAndTitle(account);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (advanceBusy) return;
        resetForm();
        onClose();
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Request for advance payment (Form No. 03-TT)</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {advanceError && <Alert severity="error">{advanceError}</Alert>}

          <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  <strong>Unit:</strong> Next-Gen Enterprise Experience
                </Typography>
                <Typography variant="body2">
                  <strong>Department (or Address):</strong> 181 Cao Thang, Ward
                  12, District 10, Ho Chi Minh
                </Typography>
              </Grid>
              <Grid
                item
                xs={12}
                md={6}
                sx={{ textAlign: { xs: "left", md: "right" } }}
              >
                <Typography variant="body2">
                  <em>Form No. 03-TT (TT 133/2016/TT-BTC)</em>
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* ✅ Ẩn Autocomplete nếu withTask=false */}
          {withTask && (
            <Autocomplete
              options={advanceOptions}
              value={advanceTask}
              onChange={(_, v) => setAdvanceTask(v)}
              getOptionLabel={(o) => (o?.name ? o.name : "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Task to advance (optional)"
                  placeholder="Type the task name..."
                />
              )}
            />
          )}

          <TextField
            label="Dear"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            fullWidth
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="My name is"
                value={fullName}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Position" value={title} fullWidth disabled />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Advance request (VND)"
                type="number"
                fullWidth
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Typography variant="body2">
                {Number(advanceAmount) > 0
                  ? `In words: ${numToWords(Number(advanceAmount))}`
                  : "Text will appear here"}
              </Typography>
            </Grid>
          </Grid>

          <TextField
            label="Reason for advance"
            multiline
            minRows={2}
            value={advanceReason}
            onChange={(e) => setAdvanceReason(e.target.value)}
            placeholder="For example: Buying materials for tasks, travel expenses,..."
            fullWidth
          />

          <TextField
            label="Payment term"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={advanceDeadline || ""}
            onChange={(e) => setAdvanceDeadline(e.target.value)}
            fullWidth
          />

          {/* chữ ký */}
          <Box>
            <Typography fontWeight={600} mb={1}>
              Person requesting advance payment - Sign
            </Typography>
            <Paper variant="outlined" sx={{ p: 1, width: "100%", height: 160 }}>
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  width: 700,
                  height: 140,
                  style: { width: "100%", height: "140px" },
                }}
                backgroundColor="#fff"
                penColor="black"
              />
            </Paper>
            <Stack direction="row" spacing={1} mt={1}>
              <Button onClick={() => sigRef?.current?.clear()}>
                Delete signature
              </Button>
              <Button
                onClick={() =>
                  sigRef?.current?.fromData(sigRef?.current?.toData())
                }
              >
                Smoothing strokes
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            if (advanceBusy) return;
            resetForm();
            onClose();
          }}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={advanceBusy}
          onClick={handleSubmit}
        >
          Send to accountant
        </Button>
      </DialogActions>
    </Dialog>
  );
}
