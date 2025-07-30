import React, { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { getEmployeeBasicInfoApi, createSalaryApi } from "~/services/accountant/salary.service";

export default function FormSinglePayslip({ onBack }) {
  const [input, setInput] = useState("");
  const [info, setInfo] = useState(null);
  const [baseSalary, setBaseSalary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const res = await getEmployeeBasicInfoApi(input);
    setInfo(res.data || null);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!info || !baseSalary) return;
    setLoading(true);
    const res = await createSalaryApi(input, baseSalary);
    setLoading(false);
    if (res.status === 200) {
      alert("Tạo phiếu lương thành công!");
      onBack();
    } else {
      alert("Lỗi: " + res.message);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField
        label="Email hoặc Số điện thoại"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        fullWidth
      />
      <Button variant="contained" onClick={handleSearch} disabled={loading}>
        {loading ? <CircularProgress size={24} /> : "Tìm nhân viên"}
      </Button>

      {info && (
        <Box>
          <Typography variant="subtitle1">
            {info.fullName} - {info.position} - {info.department}
          </Typography>
          <TextField
            label="Lương cơ bản"
            type="number"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            fullWidth
          />
          <Button variant="contained" color="primary" onClick={handleCreate}>
            Tạo Phiếu
          </Button>
        </Box>
      )}

      <Button onClick={onBack} color="secondary">
        Quay lại
      </Button>
    </Box>
  );
}
