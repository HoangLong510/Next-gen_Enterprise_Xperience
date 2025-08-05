import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  getEmployeeBasicInfoApi,
  createSalaryApi,
} from "~/services/accountant/salary.service";

export default function FormSinglePayslip({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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

    if (res.status === 201) {
      dispatch(
        setPopup({ type: "success", message: "Tạo phiếu lương thành công!" })
      );
      onSuccess();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res.message || "Tạo phiếu thất bại",
        })
      );
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
        <Box
          display="flex"
          flexDirection="column"
          alignItems="start"
          gap={1}
          p={2}
          border={1}
          borderRadius={2}
          borderColor="grey.300"
        >
          <Box display="flex" alignItems="center" gap={2}>
            {info.avatar ? (
              <img
                src={info.avatar}
                alt="avatar"
                style={{ width: 64, height: 64, borderRadius: "50%" }}
              />
            ) : (
              <Box
                width={64}
                height={64}
                borderRadius="50%"
                bgcolor="grey.300"
              />
            )}
            <Box>
              <Typography variant="h6">{info.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {info.position || "Không rõ chức vụ"} -{" "}
                {info.department || "Chưa có phòng ban"}
              </Typography>
            </Box>
          </Box>

          <Typography variant="body2">
            📅 Ngày sinh: {info.birthday} (Tuổi: {info.age})
          </Typography>
          <Typography variant="body2">📧 Email: {info.email}</Typography>
          <Typography variant="body2">📱 SĐT: {info.phone}</Typography>

          <TextField
            label="Lương cơ bản"
            type="number"
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreate}
            fullWidth
          >
            Tạo Phiếu
          </Button>
        </Box>
      )}
      <Button onClick={onClose} color="secondary">
        Quay lại
      </Button>
    </Box>
  );
}
