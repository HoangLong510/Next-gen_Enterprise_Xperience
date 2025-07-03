import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Grid,
  Divider,
  Typography,
} from "@mui/material";
import { createSalaryApi } from "~/services/accountant/salary.service";

export default function SalaryForm({ token, onCreated }) {
  const [form, setForm] = useState({
    employeeId: "",
    payrollPeriod: "",
    basicSalary: "",
    overtimeSalary: "",
    bonus: "",
    allowance: "",
    insuranceDeduction: "",
    taxDeduction: "",
    note: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const res = await createSalaryApi(
      {
        ...form,
        basicSalary: Number(form.basicSalary),
        overtimeSalary: Number(form.overtimeSalary),
        bonus: Number(form.bonus),
        allowance: Number(form.allowance),
        insuranceDeduction: Number(form.insuranceDeduction),
        taxDeduction: Number(form.taxDeduction),
      },
      token
    );
    if (res.status === 201) {
      alert("Tạo thành công");
      if (onCreated) onCreated();
    } else {
      alert(res.message);
    }
  };

  return (
    <Box>
      {/* Nhóm 1 */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Thông tin chung
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Employee ID"
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Payroll Period (YYYY-MM-DD)"
            name="payrollPeriod"
            value={form.payrollPeriod}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Nhóm 2 */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Lương & Phụ cấp
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "nowrap",
          overflowX: "auto",
          mb: 2,
        }}
      >
        <TextField
          label="Basic Salary"
          name="basicSalary"
          value={form.basicSalary}
          onChange={handleChange}
          type="number"
          sx={{ minWidth: "200px", flex: 1 }}
        />
        <TextField
          label="Overtime Salary"
          name="overtimeSalary"
          value={form.overtimeSalary}
          onChange={handleChange}
          type="number"
          sx={{ minWidth: "200px", flex: 1 }}
        />
        <TextField
          label="Bonus"
          name="bonus"
          value={form.bonus}
          onChange={handleChange}
          type="number"
          sx={{ minWidth: "200px", flex: 1 }}
        />
        <TextField
          label="Allowance"
          name="allowance"
          value={form.allowance}
          onChange={handleChange}
          type="number"
          sx={{ minWidth: "200px", flex: 1 }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Nhóm 3 */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Khấu trừ
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Insurance Deduction"
            name="insuranceDeduction"
            value={form.insuranceDeduction}
            onChange={handleChange}
            fullWidth
            type="number"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Tax Deduction"
            name="taxDeduction"
            value={form.taxDeduction}
            onChange={handleChange}
            fullWidth
            type="number"
          />
        </Grid>
      </Grid>

      {/* Ô Note full width */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Ghi chú
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <TextField
            label="Note"
            name="note"
            value={form.note}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={4}
          />
        </Grid>
      </Grid>

      {/* Nút submit */}
      <Grid container>
        <Grid item xs={12}>
          <Button variant="contained" onClick={handleSubmit}>
            Tạo Phiếu Lương
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
