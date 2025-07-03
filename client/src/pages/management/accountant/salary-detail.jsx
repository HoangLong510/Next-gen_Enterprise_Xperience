import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid
} from "@mui/material";
import { getSalaryByIdApi } from "~/services/accountant/salary.service";

export default function SalaryDetailPage({ token }) {
  const { salaryId } = useParams();
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await getSalaryByIdApi(salaryId, token);
      if (res.status === 200) {
        setSalary(res.data);
        setError("");
      } else {
        setError(res.message || "Error loading data");
      }
      setLoading(false);
    };
    fetchData();
  }, [salaryId, token]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!salary) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Chi tiết Phiếu Lương
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">ID</Typography>
            <Typography>{salary.id}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Nhân viên</Typography>
            <Typography>{salary.employeeName}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Kỳ lương</Typography>
            <Typography>{salary.payrollPeriod}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Tổng lương</Typography>
            <Typography>{salary.netSalary.toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Trạng thái</Typography>
            <Typography>{salary.status}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Người tạo</Typography>
            <Typography>{salary.createdBy}</Typography>
          </Grid>
          {salary.note && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Ghi chú</Typography>
              <Typography>{salary.note}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}
