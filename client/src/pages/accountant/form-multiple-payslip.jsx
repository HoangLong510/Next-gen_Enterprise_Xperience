import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  downloadSalaryTemplateApi,
  importSalaryFromExcelApi,
} from "~/services/accountant/salary.service";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";

export default function FormMultiplePayslip({ onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (
      file &&
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      setSelectedFile(file);
      setMessage(null);
    } else {
      setMessage("Vui lòng chọn file Excel hợp lệ");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadSalaryTemplateApi();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "salary_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setMessage("Tải bản mẫu thất bại");
    }
  };

  const dispatch = useDispatch();

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await importSalaryFromExcelApi(formData);

      if (res.status === 200) {
        const { successCount, failCount, errors } = res.data;

        if (failCount > 0) {
          const formattedErrors = errors.map((e) => `• ${e}`).join("\n");
          setMessage(formattedErrors);
          dispatch(
            setPopup({
              type: "warning",
              message: `⚠️ Có ${failCount} lỗi`,
            })
          );
        } else {
          dispatch(
            setPopup({
              type: "success",
              message: "✅ Tải lên thành công!",
            })
          );
          onClose();
        }
      } else {
        dispatch(
          setPopup({
            type: "error",
            message: res.message || "❌ Đã xảy ra lỗi khi xử lý file",
          })
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      dispatch(
        setPopup({
          type: "error",
          message:
            err?.response?.data?.message || "❌ Lỗi khi gửi file lên máy chủ",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Typography variant="h6">Tải Lên File Lương Hàng Loạt</Typography>
      <Typography variant="body2" color="text.secondary">
        Tải xuống file mẫu, điền thông tin và tải lại lên để tạo phiếu hàng
        loạt.
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
        >
          Chọn File Excel
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept=".xlsx"
          />
        </Button>
        <Button variant="outlined" onClick={handleDownloadTemplate}>
          Tải Bản Mẫu
        </Button>
      </Stack>
      {selectedFile && (
        <Typography variant="body2" color="text.secondary">
          Đã chọn: <strong>{selectedFile.name}</strong>
        </Typography>
      )}
      {message && (
        <Box
          mt={2}
          p={2}
          bgcolor="#fff3cd"
          border="1px solid #ffeeba"
          borderRadius={1}
        >
          <Typography variant="subtitle2" color="warning.main">
            Chi tiết lỗi:
          </Typography>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 14, marginTop: 8 }}>
            {message}
          </pre>
        </Box>
      )}

      <Stack direction="row" justifyContent="flex-end" spacing={2}>
        <Button variant="text" onClick={onClose}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? <CircularProgress size={20} /> : "Tải Lên"}
        </Button>
      </Stack>
    </Box>
  );
}
