import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  getMissingCheckOutApi,
  resolveMissingCheckOutApi,
} from "~/services/attendance.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

export default function MissingCheckOutReview() {
  const dispatch = useDispatch();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchRecords = async () => {
    if (!fromDate || !toDate) {
      dispatch(
        setPopup({ type: "error", message: "Vui lòng chọn khoảng thời gian" })
      );
      return;
    }
    setLoading(true);
    try {
      const data = await getMissingCheckOutApi(fromDate, toDate);
      setRecords(data);
    } catch {
      dispatch(setPopup({ type: "error", message: "Không lấy được dữ liệu" }));
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (record) => {
    setSelectedRecord(record);
    setReviewNote(record.checkOutNote || "");
    setOpenDialog(true);
  };

  const closeReviewDialog = () => {
    setOpenDialog(false);
    setSelectedRecord(null);
    setReviewNote("");
  };

  const handleResolve = async (approved) => {
    if (!selectedRecord) return;

    setResolving(true);
    try {
      await resolveMissingCheckOutApi(selectedRecord.id, reviewNote, approved);
      dispatch(
        setPopup({
          type: "success",
          message: `Đã ${approved ? "duyệt" : "từ chối"} giải trình.`,
        })
      );
      closeReviewDialog();
      fetchRecords();
    } catch (error) {
      const errMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Lỗi khi duyệt giải trình";
      dispatch(setPopup({ type: "error", message: errMsg }));
    } finally {
      setResolving(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: "auto",
        mt: 4,
        p: 3,
        border: "1px solid #ccc",
        borderRadius: 2,
      }}
    >
      <Typography variant="h5" mb={2}>
        Danh sách giải trình thiếu check-out (HR)
      </Typography>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Từ ngày"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1 }}
        />
        <Button variant="contained" onClick={fetchRecords}>
          Tìm
        </Button>
      </Stack>

      {loading ? (
        <Box textAlign="center">
          <CircularProgress />
        </Box>
      ) : records.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">
          Không có bản ghi nào
        </Typography>
      ) : (
        <List>
          {records.map((att) => (
            <ListItem
              key={att.id}
              divider
              secondaryAction={
                <Button
                  variant="outlined"
                  onClick={() => openReviewDialog(att)}
                >
                  Xem & Duyệt
                </Button>
              }
            >
              <ListItemText
                primary={`${att.account?.employee?.firstName || "?"} ${
                  att.account?.employee?.lastName || "?"
                }`}
                secondary={`Ngày check-in: ${new Date(
                  att.checkInTime
                ).toLocaleDateString()} | Ghi chú: ${
                  att.checkOutNote || "(Chưa ghi)"
                }`}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog
        open={openDialog}
        onClose={closeReviewDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review giải trình thiếu check-out</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Nhân viên:{" "}
            <strong>
              {selectedRecord?.account?.employee?.firstName}{" "}
              {selectedRecord?.account?.employee?.lastName}
            </strong>
          </Typography>
          <Typography gutterBottom>
            Ngày check-in:{" "}
            {selectedRecord &&
              new Date(selectedRecord.checkInTime).toLocaleDateString()}
          </Typography>
          <TextField
            label="Ghi chú giải trình"
            multiline
            fullWidth
            minRows={4}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={resolving} onClick={() => handleResolve(false)}>
            Từ chối
          </Button>
          <Button
            variant="contained"
            disabled={resolving}
            onClick={() => handleResolve(true)}
          >
            Duyệt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
