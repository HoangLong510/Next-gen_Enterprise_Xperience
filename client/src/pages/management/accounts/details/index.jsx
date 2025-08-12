import React, { useEffect, useState } from "react"
import {
	Box,
	TextField,
	Button,
	Typography,
	Divider,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Grid,
	Paper,
	Stack,
	useTheme,
	alpha,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Modal,
	Slide
} from "@mui/material"
import {
	ExitToApp as LogoutIcon,
	Block as BlockIcon,
	LockReset as ResetIcon,
	Person as PersonIcon,
	DevicesOther as DevicesIcon,
	ArrowBack as ArrowBackIcon,
	Devices,
	Check as CheckIcon
} from "@mui/icons-material"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ROLE_CONFIGS } from "~/constants/account.constants"
import RoleChip from "~/components/role-chip"
import {
	changeStatusApi,
	getAccountManagementDetailsApi,
	logoutSessionApi,
	resetPasswordApi,
	updateRoleApi
} from "~/services/account.service"
import { useDispatch } from "react-redux"
import { formatLongDate } from "~/utils/function"
import { setPopup } from "~/libs/features/popup/popupSlice"

const SlideTransition = React.forwardRef(function Transition(props, ref) {
	return <Slide direction="down" ref={ref} {...props} />
})

export default function AccountManagementDetails() {
	const { id } = useParams()

	const theme = useTheme()
	const { t, i18n } = useTranslation("accounts_management_page")
	const [loading, setLoading] = useState(false)
	const dispatch = useDispatch()
	const navigate = useNavigate()

	const [account, setAccount] = useState({
		username: "",
		role: "",
		enabled: true
	})

	const [openResetPassword, setOpenResetPassword] = useState(false)
	const [openChangeStatus, setOpenChangeStatus] = useState(false)
	const [logoutSessionId, setLogoutSessionId] = useState(0)
	const [sessions, setSessions] = useState([])

	const handleRoleChange = async (event) => {
		const res = await updateRoleApi(id, event.target.value)
		if (res.status === 200) {
			dispatch(
				setPopup({
					type: "success",
					message: res.message
				})
			)
			setAccount({ ...account, role: event.target.value })
		} else {
			dispatch(
				setPopup({
					type: "error",
					message: res.message
				})
			)
		}
	}

	const handleFetchData = async () => {
		setLoading(true)
		const res = await getAccountManagementDetailsApi(id)
		setLoading(false)
		if (res.status === 200) {
			if (res.data.account.username === "admin") {
				navigate("/management/accounts")
			}
			setAccount(res.data.account)
			setSessions(res.data.sessions)
		} else {
			dispatch(
				setPopup({
					type: "error",
					message: res.message
				})
			)
		}
	}

	const handleResetAccount = async () => {
		setOpenResetPassword(false)
		const res = await resetPasswordApi(id)
		if (res.status === 200) {
			dispatch(
				setPopup({
					type: "success",
					message: res.message
				})
			)
		} else {
			dispatch(
				setPopup({
					type: "error",
					message: res.message
				})
			)
		}
	}

	const handleChangeStatusAccount = async () => {
		setOpenChangeStatus(false)
		const res = await changeStatusApi(id)
		if (res.status === 200) {
			dispatch(
				setPopup({
					type: "success",
					message: res.message
				})
			)
			setAccount({ ...account, enabled: !account.enabled })
			setSessions([])
		} else {
			dispatch(
				setPopup({
					type: "error",
					message: res.message
				})
			)
		}
	}

	const handleLogoutSession = async (sessionId) => {
		const res = await logoutSessionApi(id, sessionId)
		if (res.status === 200) {
			dispatch(
				setPopup({
					type: "success",
					message: res.message
				})
			)
			handleFetchData()
		} else {
			dispatch(
				setPopup({
					type: "error",
					message: res.message
				})
			)
		}
		setLogoutSessionId(0)
	}

	useEffect(() => {
		handleFetchData()
	}, [])

	return (
		<>
			<title>{t("AccountManagementDetails")}</title>

			<Box>
				<Paper
					sx={{
						backgroundColor: theme.palette.background.default,
						boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.15)",
						borderRadius: 3,
						overflow: "hidden"
					}}
				>
					{/* Header Section */}
					<Box
						sx={{
							background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
							color: "white",
							p: 6,
							position: "relative",
							overflow: "hidden",
							"&::before": {
								content: '""',
								position: "absolute",
								inset: 0,
								background: `linear-gradient(135deg, ${alpha(
									theme.palette.primary.light,
									0.6
								)} 0%, ${alpha(
									theme.palette.primary.main,
									0.6
								)} 100%)`,
								animation: "shimmer 3s ease-in-out infinite"
							},
							"&::after": {
								content: '""',
								position: "absolute",
								top: 32,
								left: 32,
								width: 64,
								height: 64,
								background: alpha(
									theme.palette.common.white,
									0.1
								),
								borderRadius: "50%",
								filter: "blur(8px)"
							}
						}}
					>
						<Box sx={{ position: "relative", zIndex: 1 }}>
							<Typography
								variant="h5"
								sx={{
									mb: 0.5,
									fontWeight: 700,
									backgroundClip: "text"
								}}
							>
								{t("AccountManagementDetails")}
							</Typography>
							<Typography variant="body2">
								{t("ManageAccountInformationAndLoginSessions")}
							</Typography>
						</Box>
						<Box
							sx={{
								position: "absolute",
								top: 16,
								right: 16,
								display: "flex",
								gap: 1
							}}
						>
							{[0, 1, 2].map((i) => (
								<Box
									key={i}
									sx={{
										width: 8,
										height: 8,
										background: alpha(
											theme.palette.common.white,
											0.4
										),
										borderRadius: "50%",
										animation: `bounce 1.5s ease-in-out infinite ${
											i * 0.1
										}s`
									}}
								/>
							))}
						</Box>
					</Box>

					{/* Form Section */}
					<Box sx={{ p: 4, background: theme.palette.grey[50] }}>
						{/* Thông tin tài khoản */}
						<Box>
							<Grid container spacing={4}>
								{/* Information */}
								<Grid size={12}>
									<Stack spacing={1}>
										<Stack
											direction="row"
											alignItems="center"
											spacing={1}
										>
											<PersonIcon color="primary" />
											<Typography
												variant="h6"
												color="primary"
											>
												{t("information")}
											</Typography>
										</Stack>
										<Divider />
									</Stack>
								</Grid>

								<Grid size={{ xs: 12, md: 6 }}>
									<TextField
										value={account?.username}
										size="small"
										label={t("username")}
										variant="outlined"
										fullWidth
										slotProps={{
											inputLabel: { shrink: true }
										}}
										disabled={true}
										sx={{
											"& .MuiOutlinedInput-root": {
												borderRadius: 2,
												backgroundColor:
													theme.palette.background
														.default
											}
										}}
									/>
								</Grid>

								{account?.role !== "ADMIN" && (
									<Grid size={{ xs: 12, md: 6 }}>
										<FormControl fullWidth size="small">
											<InputLabel shrink>
												{t("role")}
											</InputLabel>
											<Select
												displayEmpty
												value={account?.role}
												disabled={loading}
												label={t("role")}
												onChange={handleRoleChange}
												sx={{
													borderRadius: 2,
													backgroundColor:
														theme.palette.background
															.default
												}}
											>
												{ROLE_CONFIGS.map((role) => {
													if (role.value !== "ADMIN")
														return (
															<MenuItem
																key={role.value}
																value={
																	role.value
																}
															>
																<RoleChip
																	role={
																		role.value
																	}
																/>
															</MenuItem>
														)
												})}
											</Select>
										</FormControl>
									</Grid>
								)}

								{/* Action Buttons */}
								<Grid size={12}>
									<Stack
										direction={{
											xs: "column",
											sm: "row"
										}}
										spacing={2}
										justifyContent="space-between"
									>
										<Button
											variant="outlined"
											size="medium"
											startIcon={<ArrowBackIcon />}
											sx={{
												textTransform: "capitalize",
												borderColor:
													theme.palette.primary.main
											}}
											disabled={loading}
											LinkComponent={Link}
											to="/management/accounts"
										>
											{t("back")}
										</Button>

										{account?.role !== "ADMIN" && (
											<Stack direction="row" spacing={2}>
												<Button
													variant="outlined"
													startIcon={<ResetIcon />}
													onClick={() => {
														setOpenResetPassword(
															true
														)
													}}
													color="warning"
													disabled={loading}
													sx={{
														textTransform:
															"capitalize",
														borderRadius: 2
													}}
												>
													Reset {t("password")}
												</Button>
												{account?.enabled === true ? (
													<Button
														variant="outlined"
														startIcon={
															<BlockIcon />
														}
														onClick={() =>
															setOpenChangeStatus(
																true
															)
														}
														color="error"
														sx={{
															textTransform:
																"capitalize",
															borderRadius: 2
														}}
													>
														{t("disabled")}
													</Button>
												) : (
													<Button
														variant="outlined"
														onClick={() =>
															setOpenChangeStatus(
																true
															)
														}
														startIcon={
															<CheckIcon />
														}
														color="success"
														sx={{
															textTransform:
																"capitalize",
															borderRadius: 2
														}}
													>
														{t("enabled-account")}
													</Button>
												)}
											</Stack>
										)}
									</Stack>
								</Grid>
							</Grid>
						</Box>

						<Grid>
							{/* Sessions Section */}
							<Grid size={12}>
								<Stack spacing={1} sx={{ mt: 8 }}>
									<Stack
										direction="row"
										alignItems="center"
										spacing={1}
									>
										<DevicesIcon color="primary" />
										<Typography
											variant="h6"
											color="primary"
											fontWeight={600}
										>
											{t("SessionLogin")}
										</Typography>
									</Stack>
									<Divider />
								</Stack>
							</Grid>

							<Grid size={12}>
								{sessions.length > 0 ? (
									<Box>
										<List sx={{ p: 0 }}>
											{sessions.map((session) => (
												<React.Fragment
													key={session.id}
												>
													<ListItem
														sx={{ py: 3, px: 3 }}
													>
														<Box
															sx={{
																display: "flex",
																alignItems:
																	"center",
																mr: 2,
																color: "primary.main"
															}}
														>
															<Devices />
														</Box>
														<ListItemText
															primary={
																<Typography
																	variant="subtitle1"
																	fontWeight={
																		600
																	}
																	component="span"
																>
																	{
																		session.deviceName
																	}
																</Typography>
															}
															secondary={
																<>
																	<Typography
																		variant="body2"
																		color="text.secondary"
																		component="span"
																	>
																		{t(
																			"LoggedIn"
																		)}
																		:{" "}
																		{formatLongDate(
																			session.createdAt,
																			i18n.language
																		)}
																	</Typography>
																</>
															}
														/>
														<IconButton
															edge="end"
															color="error"
															onClick={() =>
																setLogoutSessionId(
																	session.id
																)
															}
															sx={{
																borderRadius: 2,
																"&:hover": {
																	backgroundColor:
																		alpha(
																			theme
																				.palette
																				.error
																				.main,
																			0.1
																		)
																}
															}}
														>
															<LogoutIcon />
														</IconButton>
													</ListItem>
												</React.Fragment>
											))}
										</List>
									</Box>
								) : (
									<Box
										sx={{
											py: 5,
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											color: "text.secondary"
										}}
									>
										<DevicesIcon
											sx={{
												fontSize: 56,
												mb: 2,
												color: "grey.400"
											}}
										/>
										<Typography
											variant="h6"
											fontWeight={600}
											gutterBottom
										>
											{t("NoLoginSessions")}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary"
										>
											{t("NoLoginSessionsLong")}
										</Typography>
									</Box>
								)}
							</Grid>
						</Grid>
					</Box>
				</Paper>
			</Box>

			<Modal
				open={openResetPassword}
				onClose={() => setOpenResetPassword(false)}
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
				<SlideTransition in={openResetPassword} timeout={400}>
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
								borderBottom: `3px solid ${theme.palette.warning.main}`,
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
										backgroundColor:
											theme.palette.warning.main,
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
										color: theme.palette.warning.dark,
										textTransform: "capitalize"
									}}
								>
									Reset {t("password")}
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
									"AreYouSureYouWantToResetThisAccountPassword"
								)}
							</Typography>

							<Stack
								direction="row"
								spacing={2}
								justifyContent="flex-end"
							>
								<Button
									disabled={loading}
									onClick={() => setOpenResetPassword(false)}
									variant="outlined"
									color="warning"
									sx={{
										textTransform: "capitalize",
										px: 3,
										py: 1,
										borderRadius: 2,
										fontWeight: 500,
										minWidth: 100
									}}
								>
									{t("Cancel")}
								</Button>
								<Button
									disabled={loading}
									onClick={() => handleResetAccount()}
									variant="contained"
									sx={{
										backgroundColor:
											theme.palette.warning.main,
										color: "white",
										px: 3,
										py: 1,
										borderRadius: 2,
										textTransform: "capitalize",
										fontWeight: 500,
										minWidth: 100,
										transition: "all 0.2s ease-in-out",
										"&:hover": {
											backgroundColor:
												theme.palette.warning.main,
											transform: "translateY(-1px)",
											boxShadow: `0 4px 12px ${theme.palette.warning.main}33`
										}
									}}
								>
									{t("Agree")}
								</Button>
							</Stack>
						</Box>
					</Paper>
				</SlideTransition>
			</Modal>

			<Modal
				open={openChangeStatus}
				onClose={() => setOpenChangeStatus(false)}
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
				<SlideTransition in={openChangeStatus} timeout={400}>
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
								borderBottom: `3px solid ${theme.palette.warning.main}`,
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
										backgroundColor:
											theme.palette.warning.main,
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
										color: theme.palette.warning.dark,
										textTransform: "capitalize"
									}}
								>
									{t("ChangeStatus")}
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
								{t("update-account-status-confirm")}
							</Typography>

							<Stack
								direction="row"
								spacing={2}
								justifyContent="flex-end"
							>
								<Button
									disabled={loading}
									onClick={() => setOpenChangeStatus(false)}
									variant="outlined"
									color="warning"
									sx={{
										textTransform: "capitalize",
										px: 3,
										py: 1,
										borderRadius: 2,
										fontWeight: 500,
										minWidth: 100
									}}
								>
									{t("Cancel")}
								</Button>
								<Button
									disabled={loading}
									onClick={() => handleChangeStatusAccount()}
									variant="contained"
									sx={{
										backgroundColor:
											theme.palette.warning.main,
										color: "white",
										px: 3,
										py: 1,
										borderRadius: 2,
										textTransform: "capitalize",
										fontWeight: 500,
										minWidth: 100,
										transition: "all 0.2s ease-in-out",
										"&:hover": {
											backgroundColor:
												theme.palette.warning.main,
											transform: "translateY(-1px)",
											boxShadow: `0 4px 12px ${theme.palette.warning.main}33`
										}
									}}
								>
									{t("Agree")}
								</Button>
							</Stack>
						</Box>
					</Paper>
				</SlideTransition>
			</Modal>

			<Modal
				open={logoutSessionId > 0}
				onClose={() => setLogoutSessionId(0)}
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
				<SlideTransition in={logoutSessionId > 0} timeout={400}>
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
								borderBottom: `3px solid ${theme.palette.warning.main}`,
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
										backgroundColor:
											theme.palette.warning.main,
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
										color: theme.palette.warning.dark,
										textTransform: "capitalize"
									}}
								>
									{t("logout-session")}
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
								{t("logout-session-confirm")}
							</Typography>

							<Stack
								direction="row"
								spacing={2}
								justifyContent="flex-end"
							>
								<Button
									disabled={loading}
									onClick={() => setLogoutSessionId(0)}
									variant="outlined"
									color="warning"
									sx={{
										textTransform: "capitalize",
										px: 3,
										py: 1,
										borderRadius: 2,
										fontWeight: 500,
										minWidth: 100
									}}
								>
									{t("Cancel")}
								</Button>
								<Button
									disabled={loading}
									onClick={() =>
										handleLogoutSession(logoutSessionId)
									}
									variant="contained"
									sx={{
										backgroundColor:
											theme.palette.warning.main,
										color: "white",
										px: 3,
										py: 1,
										borderRadius: 2,
										textTransform: "capitalize",
										fontWeight: 500,
										minWidth: 100,
										transition: "all 0.2s ease-in-out",
										"&:hover": {
											backgroundColor:
												theme.palette.warning.main,
											transform: "translateY(-1px)",
											boxShadow: `0 4px 12px ${theme.palette.warning.main}33`
										}
									}}
								>
									{t("Agree")}
								</Button>
							</Stack>
						</Box>
					</Paper>
				</SlideTransition>
			</Modal>
		</>
	)
}
