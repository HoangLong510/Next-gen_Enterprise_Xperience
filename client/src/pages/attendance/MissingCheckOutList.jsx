import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
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
} from "@mui/material";
import { getMissingCheckOutApi, submitMissingCheckOutNoteApi } from "~/services/attendance.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

export default function MissingCheckOutList() {
  const dispatch = useDispatch();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAllMissing = async () => {
      setLoading(true);
      try {
        const data = await getMissingCheckOutApi("2000-01-01", "2099-12-31");
        setRecords(data);
      } catch {
        dispatch(setPopup({ type: "error", message: "Failed to load missing check-out records." }));
      } finally {
        setLoading(false);
      }
    };
    fetchAllMissing();
  }, [dispatch]);

  const fetchRecords = async () => {
    if (!fromDate || !toDate) {
      dispatch(setPopup({ type: "error", message: "Please select both from and to dates." }));
      return;
    }
    setLoading(true);
    try {
      const data = await getMissingCheckOutApi(fromDate, toDate);
      setRecords(data);
    } catch {
      dispatch(setPopup({ type: "error", message: "Failed to load missing check-out records." }));
    } finally {
      setLoading(false);
    }
  };

  const openNoteDialog = (record) => {
    setSelectedRecord(record);
    setNote(record.checkOutNote || "");
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedRecord(null);
    setNote("");
  };

  const handleSubmitNote = async () => {
  if (!note.trim()) {
    dispatch(setPopup({ type: "error", message: "Note cannot be empty." }));
    return;
  }
  setSubmitting(true);
  try {
    await submitMissingCheckOutNoteApi(selectedRecord.id, note.trim());
    dispatch(setPopup({ type: "success", message: "Note submitted successfully." }));
    closeDialog();

    // 👉 Chỉ gọi lại fetch nếu người dùng đã chọn khoảng ngày
    if (fromDate && toDate) {
      await fetchRecords();
    } else {
      // Nếu không chọn khoảng ngày → chỉ cập nhật state tại chỗ
      const updated = records.map((r) =>
        r.id === selectedRecord.id ? { ...r, checkOutNote: note.trim() } : r
      );
      setRecords(updated);
    }
  } catch (error) {
    dispatch(setPopup({ type: "error", message: error || "Failed to submit note." }));
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4, p: 3, border: "1px solid #ccc", borderRadius: 2 }}>
      <Typography variant="h5" mb={2}>Danh sách thiếu check-out</Typography>

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
        <Button variant="contained" onClick={fetchRecords}>Tìm</Button>
      </Stack>

      {loading ? (
        <Box textAlign="center"><CircularProgress /></Box>
      ) : records.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">Không có bản ghi nào</Typography>
      ) : (
        <List>
          {records.map((att) => (
            <ListItem
              key={att.id}
              divider
              secondaryAction={
                <Button variant="outlined" onClick={() => openNoteDialog(att)}>Giải trình</Button>
              }
            >
              <ListItemText
                primary={`Ngày check-in: ${new Date(att.checkInTime).toLocaleDateString()}`}
                secondary={`Trạng thái: ${att.status}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={openDialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Giải trình thiếu check-out</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Ngày check-in: {selectedRecord && new Date(selectedRecord.checkInTime).toLocaleDateString()}
          </Typography>
          <TextField
            label="Ghi chú giải trình"
            multiline
            fullWidth
            minRows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Hủy</Button>
          <Button variant="contained" disabled={submitting} onClick={handleSubmitNote}>
            {submitting ? "Đang gửi..." : "Gửi ghi chú"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
