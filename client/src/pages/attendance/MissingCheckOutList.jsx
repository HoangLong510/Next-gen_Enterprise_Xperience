"use client"

import { useEffect, useState } from "react"
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  Paper,
} from "@mui/material"
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Note as NoteIcon,
} from "@mui/icons-material"
import { getMissingCheckOutApi, resolveMissingCheckOutApi } from "~/services/attendance.service"
import { useDispatch } from "react-redux"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { useTranslation } from "react-i18next"

export default function MissingCheckOutList() {
  const dispatch = useDispatch()
  const { t } = useTranslation("attendance_page")

  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)

  const [openDialog, setOpenDialog] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [hrNote, setHrNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [approve, setApprove] = useState(true)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const data = await getMissingCheckOutApi(fromDate || "2000-01-01", toDate || "2099-12-31")
      setRecords(data || [])
    } catch {
      dispatch(setPopup({ type: "error", message: t("submitFailed") }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const openReviewDialog = (record, isApprove) => {
    setSelectedRecord(record)
    setApprove(isApprove)
    setHrNote("")
    setOpenDialog(true)
  }

  const closeDialog = () => {
    setOpenDialog(false)
    setSelectedRecord(null)
    setHrNote("")
  }

  const handleResolve = async () => {
    if (!selectedRecord) return
    if (!approve && !hrNote.trim()) {
      dispatch(setPopup({ type: "error", message: t("reasonRequired") }))
      return
    }
    setSubmitting(true)
    try {
      await resolveMissingCheckOutApi(selectedRecord.id, hrNote.trim(), approve)
      dispatch(
        setPopup({
          type: "success",
          message: approve ? t("approveSuccess") : t("rejectSuccess"),
        }),
      )
      closeDialog()
      fetchRecords()
    } catch (error) {
      dispatch(setPopup({ type: "error", message: error || t("submitFailed") }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ maxWidth: "1600px", mx: "auto", mt: 3, p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          bgcolor: "primary.main",
          color: "white",
          borderRadius: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <ScheduleIcon sx={{ fontSize: 40 }} />
          {t("missingCheckoutReview")}
        </Typography>
      </Paper>

      {/* Bộ lọc */}
      <Card elevation={2} sx={{ mb: 4, borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="end">
            <TextField
              label={t("fromDate")}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
              variant="outlined"
            />
            <TextField
              label={t("toDate")}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
              variant="outlined"
            />
            <Button
              variant="contained"
              onClick={fetchRecords}
              startIcon={<SearchIcon />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              {t("search")}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Danh sách */}
      {loading ? (
        <Card elevation={1} sx={{ p: 6, textAlign: "center", borderRadius: 2 }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {t("loading")}
          </Typography>
        </Card>
      ) : records.length === 0 ? (
        <Card elevation={1} sx={{ p: 6, textAlign: "center", borderRadius: 2 }}>
          <ScheduleIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t("noData")}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {t("noRecordsFound")}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {records.map((att, index) => (
            <Card key={att.id} elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={3}
                  alignItems={{ xs: "stretch", md: "center" }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: "primary.main" }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 500 }}>
                          {`${att.account?.employee?.firstName || ""} ${att.account?.employee?.lastName || ""}`.trim() ||
                            t("unknownEmployee")}
                        </Typography>
                        <Chip label={`#${index + 1}`} size="small" color="primary" variant="outlined" />
                      </Box>
                    </Stack>

                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        <Typography variant="body2" color="text.secondary">
                          <strong>{t("checkInTime")}:</strong>{" "}
                          {new Date(att.checkInTime).toLocaleDateString()}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        <NoteIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.2 }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {t("employeeNote")}:
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 0.5,
                              p: 1.5,
                              bgcolor: "grey.50",
                              borderRadius: 1,
                              fontStyle: att.checkOutEmployeeNote ? "normal" : "italic",
                              color: att.checkOutEmployeeNote ? "text.primary" : "text.disabled",
                            }}
                          >
                            {att.checkOutEmployeeNote || t("noExplanation")}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider orientation={{ xs: "horizontal", md: "vertical" }} flexItem />

                  <Stack direction={{ xs: "row", md: "column" }} spacing={1.5} sx={{ minWidth: { md: 140 } }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => openReviewDialog(att, true)}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, flex: { xs: 1, md: "none" } }}
                    >
                      {t("approve")}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<CancelIcon />}
                      onClick={() => openReviewDialog(att, false)}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, flex: { xs: 1, md: "none" } }}
                    >
                      {t("reject")}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Dialog */}
      <Dialog open={openDialog} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1, bgcolor: "primary.main", color: "white" }}>
          {approve ? <CheckCircleIcon /> : <CancelIcon />}
          {approve ? t("approveExplanation") : t("rejectExplanation")}
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t("checkInTime")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {selectedRecord && new Date(selectedRecord.checkInTime).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>

          <TextField
            label={t("hrNote")}
            multiline
            fullWidth
            minRows={4}
            value={hrNote}
            onChange={(e) => setHrNote(e.target.value)}
            required={!approve}
            variant="outlined"
            placeholder={approve ? t("optionalNote") : t("reasonRequired")}
          />
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={closeDialog} sx={{ borderRadius: 2, textTransform: "none" }}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={handleResolve}
            color="primary"
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 500, minWidth: 120 }}
          >
            {submitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {t("processing")}
              </>
            ) : approve ? (
              t("approve")
            ) : (
              t("reject")
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
