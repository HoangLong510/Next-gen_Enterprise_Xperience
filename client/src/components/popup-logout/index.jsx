import {
	Button,
	Modal,
	Box,
	Slide,
	Paper,
	Typography,
	Stack,
	useTheme
} from "@mui/material"
import LogoutIcon from "@mui/icons-material/Logout"
import React from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import { closePopupLogout } from "~/libs/features/popupLogout/popupLogoutSlice"
import { logoutApi } from "~/services/auth.service"
import { clearAccount } from "~/libs/features/account/accountSlice"
import { useNavigate } from "react-router-dom"

const SlideTransition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="down" ref={ref} {...props} />
})

export default function PopupLogout() {
	const account = useSelector((state) => state.account.value)
	const { t } = useTranslation("popup")
	const open = useSelector((state) => state.popupLogout.value)
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const theme = useTheme()

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

	const popupColor = theme.palette.primary.main
	const popupDarkColor = theme.palette.primary.dark

	if (account)
		return (
			<Modal
				open={open}
				onClose={handleClose}
				closeAfterTransition
				sx={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "center",
					pt: 4
				}}
				BackdropProps={{
					sx: {
						backgroundColor: "rgba(0, 0, 0, 0.5)"
					}
				}}
			>
				<SlideTransition in={open} timeout={400}>
					<Paper
						elevation={24}
						sx={{
							position: "relative",
							width: { xs: 340, sm: 420 },
							maxWidth: "90vw",
							borderRadius: 3,
							overflow: "hidden",
							backgroundColor: "#ffffff",
							border: `1px solid ${theme.palette.divider}`,
							outline: "none"
						}}
					>
						<Box
							sx={{
								borderBottom: `3px solid ${popupColor}`,
								p: 3,
								pb: 2,
								position: "relative"
							}}
						>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 2
								}}
							>
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
										transition:
											"transform 0.3s ease-in-out",
										"&:hover": {
											transform: "scale(1.05)"
										}
									}}
								>
									<LogoutIcon
										sx={{ fontSize: 28, color: "white" }}
									/>
								</Box>

								<Typography
									variant="h6"
									sx={{
										fontWeight: 600,
										color: popupDarkColor,
										textTransform: "capitalize"
									}}
								>
									{t("logout")}
								</Typography>
							</Box>
						</Box>

						<Box sx={{ p: 3 }}>
							<Typography
								variant="body1"
								sx={{
									lineHeight: 1.6,
									color: "text.primary",
									mb: 3,
									fontSize: "1rem"
								}}
							>
								{t(
									"are-you-sure-you-want-to-log-out-of-the-application"
								)}
							</Typography>

							<Stack
								direction="row"
								spacing={2}
								justifyContent="flex-end"
							>
								<Button
									disabled={loading}
									onClick={handleClose}
									variant="outlined"
									color="primary"
									sx={{
										textTransform: "capitalize",
										px: 3,
										py: 1,
										borderRadius: 2,
										fontWeight: 500,
										minWidth: 100
									}}
								>
									{t("cancel")}
								</Button>
								<Button
									disabled={loading}
									onClick={handleLogout}
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
											backgroundColor: popupDarkColor,
											transform: "translateY(-1px)",
											boxShadow: `0 4px 12px ${popupColor}33`
										}
									}}
								>
									{t("agree")}
								</Button>
							</Stack>
						</Box>
					</Paper>
				</SlideTransition>
			</Modal>
		)

	return null
}
