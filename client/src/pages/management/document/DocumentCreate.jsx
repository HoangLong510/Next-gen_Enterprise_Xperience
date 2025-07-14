import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
  Fade,
  Backdrop,
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
  type: yup.string().required("Vui lòng chọn kiểu công văn"),
  projectManagerId: yup
    .string()
    .nullable()
    .when("type", (type, schema) => {
      return type === "PROJECT"
        ? schema.required("Chọn quản lý dự án")
        : schema.nullable();
    }),
});

export default function DocumentCreate({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [pmList, setPmList] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      type: "",
      projectManagerId: null,
    },
  });

  const type = watch("type");
  const projectManagerId = watch("projectManagerId");

  useEffect(() => {
    async function fetchPMs() {
      const token = localStorage.getItem("accessToken");
      const res = await fetchPMsApi(token);
      if (res.status === 200) setPmList(res.data);
      else setPmList([]);
    }
    fetchPMs();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    const payload = {
      title: data.title,
      content: data.content,
      type: data.type,
      receiverId: data.type === "PROJECT" ? data.projectManagerId : null,
    };
    const res = await createDocumentApi(payload, token);
    setLoading(false);

    if (res.status === 201) {
      onSuccess && onSuccess(res.data);
      downloadWordFile(res.data.file);
      reset({
        title: "",
        content: "",
        type: "",
        projectManagerId: null,
      });
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

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "congvan.docx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        maxWidth: 480,
        bgcolor: "#fff",
        borderRadius: 3,
        p: 4,
        boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
        mx: "auto",
        mt: 5,
        position: "relative",
      }}
    >
      <Typography
        variant="h5"
        fontWeight={700}
        textAlign="center"
        color="primary.main"
        mb={2}
      >
        Tạo công văn mới
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <TextField
          label="Tiêu đề"
          placeholder="Nhập tiêu đề công văn"
          fullWidth
          margin="normal"
          error={!!errors.title}
          helperText={errors.title?.message}
          {...register("title")}
          autoComplete="off"
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        <TextField
          label="Nội dung"
          placeholder="Nhập nội dung ngắn gọn..."
          fullWidth
          multiline
          rows={4}
          margin="normal"
          error={!!errors.content}
          helperText={errors.content?.message}
          {...register("content")}
          autoComplete="off"
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        {/* Thêm input chọn kiểu công văn */}
        <TextField
          select
          label="Kiểu công văn"
          fullWidth
          margin="normal"
          error={!!errors.type}
          helperText={errors.type?.message}
          value={type || ""}
          onChange={(e) => setValue("type", e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }}
        >
          <MenuItem value="">-- Chọn kiểu công văn --</MenuItem>
          <MenuItem value="PROJECT">Công văn dự án</MenuItem>
          <MenuItem value="ADMINISTRATIVE">Công văn hành chính</MenuItem>
          <MenuItem value="OTHER">Công văn khác</MenuItem>
        </TextField>

        {/* Chỉ hiện trường PM khi kiểu là PROJECT */}
        {type === "PROJECT" && (
          <TextField
            select
            label="Quản lý dự án"
            placeholder="Chọn quản lý dự án"
            fullWidth
            margin="normal"
            error={!!errors.projectManagerId}
            helperText={errors.projectManagerId?.message}
            value={projectManagerId || ""}
            onChange={(e) => setValue("projectManagerId", e.target.value)}
            InputProps={{ sx: { borderRadius: 2 } }}
          >
            <MenuItem value="">-- Chọn quản lý dự án --</MenuItem>
            {pmList.length === 0 ? (
              <MenuItem disabled value="">
                Không có PM nào
              </MenuItem>
            ) : (
              pmList.map((pm) => (
                <MenuItem key={pm.id} value={pm.id}>
                  {pm.fullName
                    ? `${pm.fullName} (${pm.username})`
                    : pm.username}
                </MenuItem>
              ))
            )}
          </TextField>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{
              fontWeight: 600,
              borderRadius: 2,
              background: "linear-gradient(90deg,#1976d2,#4791db)",
              boxShadow: "0 2px 8px rgba(24,144,255,.08)",
            }}
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {loading ? "Đang tạo..." : "Tạo công văn"}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            color="secondary"
            onClick={onCancel}
            disabled={loading}
            sx={{ fontWeight: 600, borderRadius: 2, background: "#f8fafc" }}
          >
            Hủy
          </Button>
        </Box>
      </form>

      {/* Loading overlay */}
      <Fade in={loading}>
        <Backdrop
          open={loading}
          sx={{
            color: "#fff",
            zIndex: (theme) => theme.zIndex.drawer + 2,
            position: "absolute",
          }}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Fade>
    </Box>
  );
}
