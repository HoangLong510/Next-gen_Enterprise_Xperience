import {Modal, Box, Paper, Typography, Button, Stack, Slide, useTheme} from "@mui/material"
import {CheckCircle as SuccessIcon, Error as ErrorIcon} from "@mui/icons-material"
import {useTranslation} from "react-i18next"
import {useDispatch, useSelector} from "react-redux"
import {closePopup} from "~/libs/features/popup/popupSlice"
import {forwardRef} from "react"
import {keyframes} from "@mui/system"

const shakeAnimation = keyframes`
    0% {
        transform: translateY(0) translateX(0);
    }
    10% {
        transform: translateY(-4px) translateX(4px);
    }
    20% {
        transform: translateY(4px) translateX(-4px);
    }
    30% {
        transform: translateY(-4px) translateX(4px);
    }
    40% {
        transform: translateY(4px) translateX(-4px);
    }
    50% {
        transform: translateY(-4px) translateX(4px);
    }
    60% {
        transform: translateY(4px) translateX(-4px);
    }
    70% {
        transform: translateY(-4px) translateX(4px);
    }
    80% {
        transform: translateY(4px) translateX(-4px);
    }
    90% {
        transform: translateY(-4px) translateX(4px);
    }
    100% {
        transform: translateY(0) translateX(0);
    }
`

const SlideTransition = forwardRef(function Transition(props, ref) {
    return <Slide direction="down" ref={ref} {...props} />
})

export default function Popup() {
    const {t} = useTranslation("popup")
    const {t: tMess} = useTranslation("messages")
    const popup = useSelector((state) => state.popup.value)
    const dispatch = useDispatch()
    const theme = useTheme()

    const handleClose = () => {
        dispatch(closePopup())
    }

    const isSuccess = popup.data?.type === "success"
    const isError = popup.data?.type === "error"

    const popupColor = isSuccess ? theme.palette.primary.main : theme.palette.error.main

    return (
        <Modal
            open={popup.open}
            onClose={handleClose}
            closeAfterTransition
            sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                pt: 4,
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    outline: "none"
                },
            }}
        >
            <SlideTransition in={popup.open} timeout={400}>
                <Paper
                    elevation={24}
                    sx={{
                        position: "relative",
                        width: {xs: 340, sm: 420},
                        maxWidth: "90vw",
                        borderRadius: 3,
                        overflow: "hidden",
                        backgroundColor: "#ffffff",
                        border: "1px solid #f0f0f0",
                        animation: popup.open && isError ? `${shakeAnimation} 0.8s ease-in-out forwards` : "none",
                        outline: 'none'
                    }}
                >
                    <Box
                        sx={{
                            borderBottom: `3px solid ${popupColor}`,
                            p: 3,
                            pb: 2,
                            position: "relative",
                        }}
                    >
                        <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: "50%",
                                    backgroundColor: popupColor,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "transform 0.3s ease-in-out",
                                    "&:hover": {
                                        transform: "scale(1.05)",
                                    },
                                }}
                            >
                                {isSuccess ? (
                                    <SuccessIcon sx={{fontSize: 28, color: "white"}}/>
                                ) : (
                                    <ErrorIcon sx={{fontSize: 28, color: "white"}}/>
                                )}
                            </Box>

                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    color: popupColor,
                                    textTransform: "capitalize",
                                }}
                            >
                                {t(popup.data?.type || "success")}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{p: 3}}>
                        <Typography
                            variant="body1"
                            sx={{
                                lineHeight: 1.6,
                                color: "#333333",
                                mb: 3,
                                fontSize: "1rem",
                            }}
                        >
                            {tMess(popup.data?.message)}
                        </Typography>

                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            {isSuccess ? (
                                <Button autoFocus
                                    onClick={handleClose}
                                    variant="contained"
                                    sx={{
                                        backgroundColor: popupColor,
                                        color: "white",
                                        px: 3,
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: "capitalize",
                                        fontWeight: 500,
                                        minWidth: 100,
                                        transition: "all 0.2s ease-in-out",
                                        "&:hover": {
                                            backgroundColor: popupColor,
                                            filter: "brightness(90%)",
                                            transform: "translateY(-1px)",
                                            boxShadow: `0 4px 12px ${popupColor}33`,
                                        },
                                    }}
                                >
                                    {t("agree")}
                                </Button>
                            ) : (
                                <Button
                                    autoFocus
                                    onClick={handleClose}
                                    variant="contained"
                                    sx={{
                                        backgroundColor: popupColor,
                                        color: "white",
                                        px: 3,
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: "capitalize",
                                        fontWeight: 500,
                                        minWidth: 100,
                                        transition: "all 0.2s ease-in-out",
                                        "&:hover": {
                                            backgroundColor: popupColor,
                                            filter: "brightness(90%)",
                                            transform: "translateY(-1px)",
                                            boxShadow: `0 4px 12px ${popupColor}33`,
                                        },
                                    }}
                                >
                                    {t("close")}
                                </Button>
                            )}
                        </Stack>
                    </Box>
                </Paper>
            </SlideTransition>
        </Modal>
    )
}