import {useState} from "react"
import {
    Modal,
    Box,
    Paper,
    Typography,
    Button,
    Stack,
    Slide,
    TextField,
    useTheme,
    alpha
} from "@mui/material"
import {LockReset as LockResetIcon} from "@mui/icons-material"
import {useTranslation} from "react-i18next"
import {forwardRef} from "react"
import {useDispatch, useSelector} from "react-redux"
import {closeChangePassword} from "~/libs/features/changePassword/changePasswordSlice.js"
import * as yup from "yup"
import {useForm} from "react-hook-form"
import {yupResolver} from "@hookform/resolvers/yup"
import {changePasswordApi} from "~/services/auth.service.js"
import {useNavigate} from "react-router-dom"
import {clearAccount} from "~/libs/features/account/accountSlice.js"
import {setPopup} from "~/libs/features/popup/popupSlice.js"
import BeautifulAlert from "~/components/beautiful-alert/index.jsx";

const SlideTransition = forwardRef(function Transition(props, ref) {
    return <Slide direction="down" ref={ref} {...props} />
})

const schema = yup.object().shape({
    password: yup.string().required("password-is-required"),
    newPassword: yup
        .string()
        .required("password-is-required")
        .min(6, "password-must-be-between-6-and-30-characters")
        .max(30, "password-must-be-between-6-and-30-characters"),
    confirmNewPassword: yup
        .string()
        .required("confirm-password-is-required")
        .oneOf([yup.ref("newPassword"), null], "confirm-password-does-not-match"),
})

export default function ChangePasswordDialog() {
    const {t} = useTranslation("change_password_dialog")
    const {t: tError} = useTranslation("errors")

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")

    const account = useSelector((state) => state.account.value)
    const open = useSelector((state) => state.changePassword.value)
    const dispatch = useDispatch()
    const theme = useTheme()
    const navigate = useNavigate()

    const primaryMain = theme.palette.primary.main
    const primaryDark = theme.palette.primary.dark
    const dividerColor = theme.palette.divider

    const handleClose = () => {
        dispatch(closeChangePassword())
        setMessage("")
        reset()
    }

    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: {errors},
    } = useForm({
        resolver: yupResolver(schema),
    })

    const handleChangePassword = async (data) => {
        setMessage("")
        setLoading(true)
        const res = await changePasswordApi(data)
        setLoading(false)
        if (res.status === 200) {
            localStorage.removeItem("accessToken")
            localStorage.removeItem("refreshToken")
            dispatch(setPopup({type: "success", message: res.message}))
            dispatch(clearAccount())
            handleClose()
            navigate("/auth/login")
        } else {
            if (res.errors) {
                Object.entries(res.errors).forEach(([field, message]) => {
                    setError(field, {
                        type: "manual",
                        message: message,
                    })
                })
            }
            setMessage(res.message)
        }
    }

    if (account)
        return (
            <Modal
                open={open}
                onClose={handleClose}
                closeAfterTransition
                sx={{
                    display: "flex",
                    alignItems: "center", // Changed to center for better positioning
                    justifyContent: "center",
                    p: 2,
                }}
                BackdropProps={{
                    sx: {
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                    },
                }}
            >
                <SlideTransition in={open} timeout={400}>
                    <Paper
                        elevation={24}
                        sx={{
                            position: "relative",
                            width: {xs: 360, sm: 480},
                            maxWidth: "90vw",
                            borderRadius: 3,
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                            border: `1px solid ${dividerColor}`,
                            outline: "none",
                            // Add slide animation
                            transform: open ? "translateY(0)" : "translateY(-100vh)",
                            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                    >
                        <form onSubmit={handleSubmit(handleChangePassword)}>
                            {/* Header */}
                            <Box
                                sx={{
                                    borderBottom: `3px solid ${primaryMain}`,
                                    p: 3,
                                    pb: 2,
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    background: `linear-gradient(135deg, 
                                    ${alpha(primaryMain, 0.05)} 0%, 
                                    ${alpha(primaryMain, 0.02)} 100%)`,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: "50%",
                                        backgroundColor: primaryMain,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        boxShadow: `0 4px 12px ${alpha(primaryMain, 0.3)}`,
                                        transition: "transform 0.3s ease-in-out",
                                        "&:hover": {
                                            transform: "scale(1.05)",
                                        },
                                    }}
                                >
                                    <LockResetIcon sx={{fontSize: 30, color: "white"}}/>
                                </Box>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 600,
                                        color: primaryDark,
                                        textTransform: "none",
                                        flexGrow: 1,
                                    }}
                                >
                                    {t("change-password")}
                                </Typography>
                            </Box>

                            {/* Content */}
                            <Box sx={{p: 4}}>
                                {/* Beautiful Alert */}
                                <BeautifulAlert message={message} />

                                <Typography
                                    variant="body1"
                                    sx={{
                                        color: "text.secondary",
                                        mb: 3,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {t("enter-your-current-password-and-new-password")}
                                </Typography>

                                <Stack spacing={3}>
                                    <TextField
                                        {...register("password")}
                                        helperText={tError(errors.password?.message || "")}
                                        disabled={loading}
                                        error={!!errors.password}
                                        label={t("current-password")}
                                        type={"password"}
                                        variant={"filled"}
                                        fullWidth
                                        autoFocus
                                        slotProps={{inputLabel: {shrink: true}}}
                                        sx={{
                                            "& .MuiFilledInput-root": {
                                                borderRadius: 2,
                                                "&:hover": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                                },
                                                "&.Mui-focused": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                                },
                                            },
                                        }}
                                    />
                                    <TextField
                                        {...register("newPassword")}
                                        helperText={tError(errors.newPassword?.message || "")}
                                        disabled={loading}
                                        error={!!errors.newPassword}
                                        label={t("new-password")}
                                        type={"password"}
                                        variant={"filled"}
                                        fullWidth
                                        slotProps={{inputLabel: {shrink: true}}}
                                        sx={{
                                            "& .MuiFilledInput-root": {
                                                borderRadius: 2,
                                                "&:hover": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                                },
                                                "&.Mui-focused": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                                },
                                            },
                                        }}
                                    />
                                    <TextField
                                        {...register("confirmNewPassword")}
                                        helperText={tError(errors.confirmNewPassword?.message || "")}
                                        disabled={loading}
                                        error={!!errors.confirmNewPassword}
                                        label={t("confirm-new-password")}
                                        type={"password"}
                                        variant={"filled"}
                                        fullWidth
                                        slotProps={{inputLabel: {shrink: true}}}
                                        sx={{
                                            "& .MuiFilledInput-root": {
                                                borderRadius: 2,
                                                "&:hover": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                                },
                                                "&.Mui-focused": {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                                },
                                            },
                                        }}
                                    />
                                </Stack>
                            </Box>

                            {/* Actions */}
                            <Box
                                sx={{
                                    p: 4,
                                    pt: 0,
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 2,
                                }}
                            >
                                <Button
                                    disabled={loading}
                                    onClick={handleClose}
                                    variant="outlined"
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    disabled={loading}
                                    type="submit"
                                    variant="contained"
                                >
                                    {t("change")}
                                </Button>
                            </Box>
                        </form>
                    </Paper>
                </SlideTransition>
            </Modal>
        )

    return null
}
