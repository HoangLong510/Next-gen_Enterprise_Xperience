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
import { closePopup } from "~/libs/features/popup/popupSlice"
import {
	CheckCircle as SuccessIcon,
	Error as ErrorIcon,
	Close as CloseIcon
} from "@mui/icons-material"

const Transition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="down" ref={ref} {...props} />
})

export default function Popup() {
	const { t } = useTranslation("popup")
	const { t: tMess } = useTranslation("messages")
	const popup = useSelector((state) => state.popup.value)
	const dispatch = useDispatch()

	const handleClose = () => {
		dispatch(closePopup())
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
				{popup.data.type === "success" ? (
					<SuccessIcon
						sx={{
							fontSize: 28,
							color: "success.main"
						}}
					/>
				) : (
					<ErrorIcon
						sx={{
							fontSize: 28,
							color: "error.main"
						}}
					/>
				)}
				<Typography
					variant="h6"
					sx={{
						fontWeight: 600,
						textTransform: "capitalize",
						flex: 1,
						color:
							popup.data.type === "success"
								? "success.main"
								: "error.main"
					}}
				>
					{t(popup.data.type || "success")}
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
					{tMess(popup.data.message)}
				</Typography>

				{/* Actions */}
				<Stack direction="row" spacing={2} justifyContent="flex-end">
					{popup.data.type === "error" && (
						<Button
							onClick={handleClose}
							variant="outlined"
							color="error"
							sx={{
								textTransform: "capitalize"
							}}
						>
							{t("close")}
						</Button>
					)}
					{popup.data.type === "success" && (
						<Button
							onClick={handleClose}
							variant="contained"
							color="success"
							sx={{
								textTransform: "capitalize"
							}}
						>
							{t("agree")}
						</Button>
					)}
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
				open={popup.open}
				onClick={handleClose} // Click vào backdrop cũng đóng popup
			/>

			{/* Popup chính */}
			<Snackbar
				open={popup.open}
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
