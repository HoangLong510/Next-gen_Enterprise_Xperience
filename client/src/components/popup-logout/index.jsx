import {
	Button,
	Snackbar,
	Box,
	Slide,
	Paper,
	Typography,
	Stack,
	Backdrop
} from "@mui/material"
import React from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import { Close as CloseIcon } from "@mui/icons-material"
import { closePopupLogout } from "~/libs/features/popupLogout/popupLogoutSlice"
import { logoutApi } from "~/services/auth.service"
import { clearAccount } from "~/libs/features/account/accountSlice"
import {useNavigate} from "react-router-dom";

const Transition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="down" ref={ref} {...props} />
})

export default function PopupLogout() {
	const { t } = useTranslation("popup")
	const open = useSelector((state) => state.popupLogout.value)
	const dispatch = useDispatch()
	const navigate = useNavigate()

	const [loading, setLoading] = React.useState(false)

	const handleClose = () => {
		dispatch(closePopupLogout())
	}

	const handleLogout = async () => {
		setLoading(true)
		const accessToken = localStorage.getItem("accessToken")
		if (accessToken) {
			const res = await logoutApi(accessToken)
			if (res.status === 200) {
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				dispatch(clearAccount())
				navigate("/auth/login")
				handleClose()
			}
		}
		setLoading(false)
	}

	// Custom Alert component với buttons
	const CustomAlert = () => (
		<Paper
			elevation={8}
			sx={{
				minWidth: 350,
				maxWidth: 500,
				borderRadius: 3,
				overflow: "hidden",
				boxShadow: "0 12px 40px rgba(0,0,0,0.15)"
			}}
		>
			{/* Header với icon và title - không có màu nền */}
			<Box
				sx={{
					p: 2.5,
					pb: 1.5,
					display: "flex",
					alignItems: "center",
					gap: 1.5,
					borderBottom: "1px solid",
					borderBottomColor: "divider"
				}}
			>
				<Typography
					variant="h6"
					sx={{
						fontWeight: 600,
						textTransform: "capitalize",
						flex: 1,
						color: "primary.main"
					}}
				>
					{t("logout")}
				</Typography>
				<Button
					size="small"
					onClick={handleClose}
					sx={{
						minWidth: "auto",
						p: 0.5,
						color: "text.secondary",
						"&:hover": {
							bgcolor: "action.hover"
						}
					}}
				>
					<CloseIcon fontSize="small" />
				</Button>
			</Box>

			{/* Content */}
			<Box sx={{ p: 2.5, pt: 3 }}>
				<Typography
					variant="body1"
					sx={{
						mb: 3,
						lineHeight: 1.6,
						color: "text.primary"
					}}
				>
					{t("are-you-sure-you-want-to-log-out-of-the-application")}
				</Typography>

				{/* Actions */}
				<Stack direction="row" spacing={2} justifyContent="flex-end">
					<Button
						disabled={loading}
						onClick={handleClose}
						variant="outlined"
						color="primary"
						sx={{
							textTransform: "capitalize"
						}}
					>
						{t("close")}
					</Button>
					<Button
						disabled={loading}
						onClick={handleLogout}
						variant="contained"
						color="primary"
						sx={{
							textTransform: "capitalize"
						}}
					>
						{t("agree")}
					</Button>
				</Stack>
			</Box>
		</Paper>
	)

	return (
		<>
			{/* Backdrop để làm mờ nền */}
			<Backdrop
				sx={{
					color: "#fff",
					zIndex: (theme) => theme.zIndex.snackbar - 1,
					backgroundColor: "rgba(0, 0, 0, 0.6)" // Độ mờ có thể tùy chỉnh
				}}
				open={open}
				onClick={handleClose} // Click vào backdrop cũng đóng popup
			/>

			{/* Popup chính */}
			<Snackbar
				open={open}
				onClose={handleClose}
				TransitionComponent={Transition}
				anchorOrigin={{
					vertical: "top",
					horizontal: "center"
				}}
				sx={{
					"& .MuiSnackbar-root": {
						position: "relative"
					},
					zIndex: (theme) => theme.zIndex.snackbar // Đảm bảo popup hiển thị trên backdrop
				}}
				autoHideDuration={null}
			>
				<Box>
					<CustomAlert />
				</Box>
			</Snackbar>
		</>
	)
}
