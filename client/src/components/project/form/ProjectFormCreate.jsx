import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setPopup } from "~/libs/features/popup/popupSlice";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useEffect } from "react";
import { createProjectFromDocument } from "~/services/project.service";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

const schema = yup.object({
  name: yup.string().required("project-name-is-required").min(3).max(100),
  description: yup.string().required("description-is-required").min(10).max(1000),
  deadline: yup
    .string()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "invalid-date-format")
    .test("not-in-past", "deadline-cannot-be-in-the-past", (value) => {
      if (!value) return true;
      const localToday = dayjs().format("YYYY-MM-DD");
      return value >= localToday;
    }),
  // optional
});

const defaultValues = {
  name: "",
  description: "",
  deadline: dayjs().add(7, "day").format("YYYY-MM-DD"),
};

export default function ProjectFormCreate({
  open,
  onClose,
  onSubmit,
  initialData = null,
  document,
  documentId,
  pmName,
}) {
  const dispatch = useDispatch();
  const { t: tProject } = useTranslation("project");
  const { t: tMsg } = useTranslation("messages"); // popup message key từ BE (giữ nguyên)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // helper: ưu tiên dịch qua project.form.validation -> fallback messages -> raw
  const translateFieldError = (msgKey) => {
    if (!msgKey) return undefined;
    const viaProject = tProject(`form.validation.${msgKey}`);
    if (viaProject !== `form.validation.${msgKey}`) return viaProject;
    const viaMessages = tMsg(msgKey);
    if (viaMessages !== msgKey) return viaMessages;
    return msgKey;
  };

  // tính hôm nay theo local, dùng cho input min và clamp deadline
  const localToday = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    // Ưu tiên document → initialData → defaultValues
    if (document) {
      let data = {
        name: document.projectName || "",
        description: document.projectDescription || "",
        deadline: document.projectDeadline
          ? dayjs(document.projectDeadline).format("YYYY-MM-DD")
          : dayjs().add(7, "day").format("YYYY-MM-DD"),
      };
      if (data.deadline && data.deadline < localToday) {
        data.deadline = localToday;
      }
      reset(data);
    } else if (initialData) {
      const merged = {
        ...defaultValues,
        ...initialData,
      };
      if (merged.deadline) {
        merged.deadline = dayjs(merged.deadline).format("YYYY-MM-DD");
        if (merged.deadline < localToday) merged.deadline = localToday;
      } else {
        merged.deadline = defaultValues.deadline;
      }
      reset(merged);
    } else {
      reset(defaultValues);
    }
  }, [document, initialData, open, reset, localToday]);

  const handleFormSubmit = async (data) => {
    const payload = { ...data, documentId };
    const res = await createProjectFromDocument(payload);

    if (res?.status === 200 || res?.status === 201) {
      dispatch(
        setPopup({
          type: "success",
          message: res?.message || "project-created-successfully",
        })
      );
      onSubmit?.();
      onClose();
    } else {
      dispatch(
        setPopup({
          type: "error",
          message: res?.message || "create-project-failed",
        })
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography fontWeight={600}>
          {tProject("formCreate.title")} {/* Create Project from Document */}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {tProject("formCreate.pmLabel")}{" "}
            <strong>{pmName || document?.pmName || ""}</strong>
          </Typography>

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={tProject("form.labels.projectName")}
                fullWidth
                size="small"
                disabled
                error={!!errors.name}
                helperText={translateFieldError(errors.name?.message)}
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={tProject("form.labels.description")}
                fullWidth
                size="small"
                multiline
                rows={3}
                disabled
                error={!!errors.description}
                helperText={translateFieldError(errors.description?.message)}
              />
            )}
          />

          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={tProject("form.labels.deadline")}
                type="date"
                fullWidth
                size="small"
                disabled
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: localToday }}
                error={!!errors.deadline}
                helperText={translateFieldError(errors.deadline?.message)}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          {tProject("form.buttons.cancel")}
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          sx={{ bgcolor: "#118D57" }}
        >
          {tProject("formCreate.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
