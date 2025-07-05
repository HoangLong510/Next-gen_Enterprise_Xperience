import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect, useState } from "react";
import { createDocumentApi } from "~/services/document.service";
import { fetchPMsApi } from "~/services/account.service";

const schema = yup.object().shape({
  title: yup.string().required("Vui lòng nhập tiêu đề"),
  content: yup.string().required("Vui lòng nhập nội dung"),
  projectManagerId: yup.string().required("Chọn quản lý dự án"),
});

export default function DocumentCreate({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [pmList, setPmList] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => {
    const fetchPMs = async () => {
      const token = localStorage.getItem("accessToken");
      const res = await fetchPMsApi(token);
      if (res.status === 200) setPmList(res.data);
      else setPmList([]);
    };
    fetchPMs();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    const res = await createDocumentApi(data, token);
    setLoading(false);
    if (res.status === 201) {
      onSuccess && onSuccess(res.data);
      downloadWordFile(res.data.file);
      reset();
    } else {
      setError("title", {
        type: "manual",
        message: res.message || "Tạo công văn thất bại",
      });
    }
  };


  const downloadWordFile = (base64Data) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Tạo link và click để tải file
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "congvan.docx"); // Tên file tải về
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // --- Dùng như sau khi nhận response
  // downloadWordFile(response.data.file);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "500px",
        bgcolor: "#fff",
        borderRadius: "10px",
        p: 3,
        boxShadow: "0px 0px 10px rgba(0,0,0,0.12)",
      }}
    >
      <Typography sx={{ fontWeight: 600, mb: 2, fontSize: 18 }}>
        Tạo công văn mới
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          {...register("title")}
          label="Tiêu đề"
          fullWidth
          margin="normal"
          error={!!errors.title}
          helperText={errors.title?.message}
          autoComplete="off"
        />
        <TextField
          {...register("content")}
          label="Nội dung"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          error={!!errors.content}
          helperText={errors.content?.message}
          autoComplete="off"
        />
        <TextField
          {...register("projectManagerId")}
          label="Quản lý dự án"
          fullWidth
          margin="normal"
          select
          error={!!errors.projectManagerId}
          helperText={errors.projectManagerId?.message}
        >
          {pmList.map((pm) => (
            <MenuItem key={pm.id} value={pm.id}>
              {pm.fullName ? `${pm.fullName} (${pm.username})` : pm.username}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            fullWidth
            startIcon={
              loading ? <CircularProgress size={18} color="inherit" /> : null
            }
          >
            {loading ? "Đang tạo..." : "Tạo công văn"}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={onCancel}
            disabled={loading}
            color="secondary"
          >
            Hủy
          </Button>
        </Box>
      </form>
    </Box>
  );
}
