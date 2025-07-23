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
  title: yup.string().required("Please enter the title"),
  content: yup.string().required("Please enter the content"),
  type: yup.string().required("Please select document type"),
  projectManagerId: yup
    .string()
    .nullable()
    .when("type", (type, schema) => {
      return type === "PROJECT"
        ? schema.required("Select Project Manager")
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
      reset({
        title: "",
        content: "",
        type: "",
        projectManagerId: null,
      });
    } else {
      setError("title", {
        type: "manual",
        message: res.message || "Create document failed",
      });
    }
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
        Create New Document
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <TextField
          label="Title"
          placeholder="Enter document title"
          fullWidth
          margin="normal"
          error={!!errors.title}
          helperText={errors.title?.message}
          {...register("title")}
          autoComplete="off"
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        <TextField
          label="Content"
          placeholder="Enter a short description..."
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

        <TextField
          select
          label="Document Type"
          fullWidth
          margin="normal"
          error={!!errors.type}
          helperText={errors.type?.message}
          value={type || ""}
          onChange={(e) => setValue("type", e.target.value)}
          InputProps={{ sx: { borderRadius: 2 } }}
        >
          <MenuItem value="">-- Select document type --</MenuItem>
          <MenuItem value="PROJECT">Project Document</MenuItem>
          <MenuItem value="ADMINISTRATIVE">Administrative Document</MenuItem>
          <MenuItem value="OTHER">Other Document</MenuItem>
        </TextField>

        {type === "PROJECT" && (
          <TextField
            select
            label="Project Manager"
            placeholder="Select Project Manager"
            fullWidth
            margin="normal"
            error={!!errors.projectManagerId}
            helperText={errors.projectManagerId?.message}
            value={projectManagerId || ""}
            onChange={(e) => setValue("projectManagerId", e.target.value)}
            InputProps={{ sx: { borderRadius: 2 } }}
          >
            <MenuItem value="">-- Select Project Manager --</MenuItem>
            {pmList.length === 0 ? (
              <MenuItem disabled value="">
                No Project Managers found
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
            {loading ? "Creating..." : "Create Document"}
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
            Cancel
          </Button>
        </Box>
      </form>

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
