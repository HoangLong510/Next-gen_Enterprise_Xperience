import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    Typography,
} from "@mui/material"
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import dayjs from "dayjs"
import { createTask } from "~/services/task.service"
import { useEffect } from "react"
const schema = yup.object({
    name: yup
        .string()
        .required("Task name is required")
        .min(3)
        .max(100),
    description: yup
        .string()
        .required("Description is required")
        .min(10)
        .max(1000),
    deadline: yup
        .date()
        .required("Deadline is required")
        .min(dayjs().toDate(), "Deadline must be today or later"),
})

const defaultValues = {
    name: "",
    description: "",
    deadline: dayjs().add(3, "day").format("YYYY-MM-DD"), // mặc định 3 ngày nữa
}
export default function TaskCreate({ open, onClose, onSubmit, projectId }) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues,
    })

    // Reset form mỗi khi mở
    useEffect(() => {
        if (open) reset(defaultValues)
    }, [open, reset])

    const handleFormSubmit = async (data) => {
        const payload = {
            ...data,
            projectId,
        }
        const res = await createTask(payload)

        if (res.status === 200) {
            onSubmit?.() // reload nếu có
            onClose()
        } else {
            alert(res.message || "Failed to create task")
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography fontWeight={600}>Create New Task</Typography>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={3} mt={1}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Task Name"
                                fullWidth
                                size="small"
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        )}
                    />

                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                size="small"
                                error={!!errors.description}
                                helperText={errors.description?.message}
                            />
                        )}
                    />

                    <Controller
                        name="deadline"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Deadline"
                                type="date"
                                fullWidth
                                size="small"
                                error={!!errors.deadline}
                                helperText={errors.deadline?.message}
                                InputLabelProps={{ shrink: true }}
                            />
                        )}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} variant="outlined" color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit(handleFormSubmit)}
                    variant="contained"
                    sx={{ bgcolor: "#1976D2" }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    )
}