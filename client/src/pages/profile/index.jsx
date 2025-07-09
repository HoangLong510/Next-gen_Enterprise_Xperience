import { useRef } from "react"
import {
	Box,
	Card,
	CardContent,
	Button,
	Typography,
	IconButton,
	alpha,
	useTheme,
	Stack
} from "@mui/material"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { formatDate, getTimeAgo } from "~/utils/function.js"
import CustomAvatar from "~/components/custom-avatar/index.jsx"
import { changeAvatarApi } from "~/services/employee.service.js"
import { setPopup } from "~/libs/features/popup/popupSlice.js"
import { setAccount } from "~/libs/features/account/accountSlice.js"
import { setPopupLogout } from "~/libs/features/popupLogout/popupLogoutSlice"
import { setChangePassword } from "~/libs/features/changePassword/changePasswordSlice.js"

import Email from "@mui/icons-material/Email"
import Phone from "@mui/icons-material/Phone"
import LocationOn from "@mui/icons-material/LocationOn"
import Work from "@mui/icons-material/Work"
import Cake from "@mui/icons-material/Cake"
import Person from "@mui/icons-material/Person"
import PhotoCamera from "@mui/icons-material/PhotoCamera"
import Edit from "@mui/icons-material/Edit"
import BusinessCenter from "@mui/icons-material/BusinessCenter"
import Schedule from "@mui/icons-material/Schedule"
import EmojiEvents from "@mui/icons-material/EmojiEvents"
import AssignmentTurnedIn from "@mui/icons-material/AssignmentTurnedIn"
import Logout from "@mui/icons-material/Logout"
import Key from "@mui/icons-material/Key"
import RoleChip from "~/components/role-chip"

export default function ProfilePage() {
	const theme = useTheme()
	const dispatch = useDispatch()
	const { t, i18n } = useTranslation("profile_page")
	const account = useSelector((state) => state.account.value)
	const fileInputRef = useRef(null)

	const handleFileSelect = () => {
		fileInputRef.current?.click()
	}

	const handleAvatarChange = async (event) => {
		const file = event.target.files?.[0]
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				dispatch(setPopup({ type: "error", message: "file-too-large" }))
			} else {
				const form = new FormData()
				form.append("file", file)
				const res = await changeAvatarApi(form)
				if (res.status !== 200) {
					dispatch(setPopup({ type: "error", message: res.message }))
				} else {
					dispatch(
						setAccount({
							...account,
							avatar: res.data
						})
					)
					dispatch(
						setPopup({ type: "success", message: res.message })
					)
				}
			}
			fileInputRef.current.value = null
		}
	}

	const profileDetails = [
		{
			icon: Work,
			label: "Department",
			value: account.department || "N/A"
		},
		{
			icon: Cake,
			label: "BirthDate",
			value: account.dateBirth
				? formatDate(account.dateBirth, i18n.language)
				: "N/A"
		},
		{
			icon: Person,
			label: "Gender",
			value: t(account.gender || "OTHER")
		},
		{
			icon: Email,
			label: "EmailAddress",
			value: account.email || "N/A"
		},
		{
			icon: Phone,
			label: "PhoneNumber",
			value: account.phone || "N/A"
		},
		{
			icon: LocationOn,
			label: "Address",
			value: account.address || "N/A"
		}
	]

	const statsData = [
		{
			icon: BusinessCenter,
			title: t("Projects"),
			value: "0",
			subtitle: t("OngoingAndCompletedProjects")
		},
		{
			icon: AssignmentTurnedIn,
			title: t("Tasks"),
			value: "0",
			subtitle: t("TotalCompletedTasks")
		},
		{
			icon: Schedule,
			title: t("Joined"),
			value: getTimeAgo(account.createdAt, i18n.language),
			subtitle: t("JoinedTheCompany")
		}
	]

	const handleLogout = () => {
		dispatch(setPopupLogout())
	}

	const handleChangePassword = () => {
		dispatch(setChangePassword())
	}

	return (
		<>
			<title>
				{`${t("profile")} - ${account.firstName} ${account.lastName}`}
			</title>
			<Box
				sx={{
					minHeight: "100vh",
					position: "relative",
					"&::before": {
						content: '""',
						position: "fixed",
						top: 80,
						left: 40,
						width: 128,
						height: 128,
						background: alpha(theme.palette.primary.light, 0.1),
						borderRadius: "50%",
						filter: "blur(60px)",
						animation: "pulse 4s ease-in-out infinite",
						pointerEvents: "none"
					},
					"&::after": {
						content: '""',
						position: "fixed",
						bottom: 80,
						right: 40,
						width: 96,
						height: 96,
						background: alpha(theme.palette.primary.main, 0.1),
						borderRadius: "50%",
						filter: "blur(40px)",
						animation: "pulse 4s ease-in-out infinite 1s",
						pointerEvents: "none"
					},
					"@keyframes pulse": {
						"0%, 100%": { opacity: 0.4 },
						"50%": { opacity: 0.8 }
					}
				}}
			>
				<Box sx={{ mx: "auto" }}>
					{/* Main Content */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" },
							gap: 4,
							mb: 4
						}}
					>
						{/* Profile Card */}
						<Card
							sx={{
								overflow: "hidden",
								border: "none",
								boxShadow: `0 20px 40px ${alpha(
									theme.palette.primary.main,
									0.15
								)}`,
								background: alpha(
									theme.palette.background.paper,
									0.95
								),
								backdropFilter: "blur(20px)",
								borderRadius: 4
							}}
						>
							<CardContent sx={{ p: 0 }}>
								{/* Cover Background */}
								<Box
									sx={{
										height: 200,
										background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
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
											animation:
												"shimmer 3s ease-in-out infinite"
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
										},
										"@keyframes shimmer": {
											"0%, 100%": { opacity: 0.8 },
											"50%": { opacity: 1 }
										}
									}}
								>
									{/* Floating dots */}
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
														theme.palette.common
															.white,
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

								{/* Profile Content */}
								<Box
									sx={{
										px: 3,
										pb: 3,
										mt: -8,
										position: "relative"
									}}
								>
									{/* Avatar Section */}
									<Box
										sx={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											mb: 3
										}}
									>
										<Box
											sx={{
												position: "relative",
												cursor: "pointer",
												"&:hover .avatar-overlay": {
													opacity: 1
												},
												"&:hover .avatar-main": {
													transform: "scale(1.05)"
												}
											}}
											onClick={handleFileSelect}
										>
											<CustomAvatar
												src={account.avatar}
												sx={{
													width: 128,
													height: 128,
													border: `4px solid ${theme.palette.background.paper}`,
													boxShadow: `0 12px 24px ${alpha(
														theme.palette.primary
															.main,
														0.2
													)}`
												}}
											/>

											{/* Hover Overlay */}
											<Box
												className="avatar-overlay"
												sx={{
													position: "absolute",
													top: 0,
													left: 0,
													right: 0,
													bottom: 0,
													borderRadius: "50%",
													backgroundColor:
														"rgba(0, 0, 0, 0.5)",
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													justifyContent: "center",
													opacity: 0,
													transition:
														"opacity 0.3s ease-in-out",
													color: "white",
													zIndex: 2
												}}
											>
												<PhotoCamera
													sx={{
														fontSize: "2rem",
														mb: 0.5
													}}
												/>
												<Typography
													variant="caption"
													sx={{ fontWeight: 600 }}
												>
													{t("Change")}
												</Typography>
											</Box>

											{/* Edit Button */}
											<IconButton
												sx={{
													position: "absolute",
													bottom: -8,
													right: -8,
													background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
													color: "white",
													width: 40,
													height: 40,
													"&:hover": {
														background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
														transform: "scale(1.1)"
													},
													transition:
														"all 0.2s ease-in-out",
													boxShadow: `0 8px 16px ${alpha(
														theme.palette.primary
															.main,
														0.3
													)}`,
													zIndex: 3
												}}
											>
												<Edit />
											</IconButton>
										</Box>

										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											onChange={handleAvatarChange}
											style={{ display: "none" }}
										/>

										{/* Name and Role */}
										<Box
											sx={{ textAlign: "center", mt: 2 }}
										>
											<Typography
												variant="h5"
												sx={{
													fontWeight: 700,
													color: "text.primary",
													mb: 0.5
												}}
											>
												{account.firstName}{" "}
												{account.lastName}
											</Typography>
											<Typography
												variant="body2"
												sx={{
													color: "text.secondary",
													mb: 1.5
												}}
											>
												@{account.username}
											</Typography>
											<RoleChip
												role={account.role}
												size="medium"
											/>
										</Box>

										{/* Upload Instructions */}
										<Box
											sx={{
												textAlign: "center",
												mt: 4,
												p: 2,
												background: alpha(
													theme.palette.primary.main,
													0.05
												),
												borderRadius: 3,
												border: `1px solid ${alpha(
													theme.palette.primary.main,
													0.1
												)}`
											}}
										>
											<Typography
												variant="body2"
												sx={{
													color: theme.palette.primary
														.main,
													fontWeight: 600,
													mb: 0.5
												}}
											>
												{t(
													"click-avatar-to-change-photo"
												)}
											</Typography>
											<Typography
												variant="caption"
												sx={{ color: "text.secondary" }}
											>
												JPG, PNG, GIF ({t("max")} 5MB)
											</Typography>
										</Box>
									</Box>
								</Box>
							</CardContent>
						</Card>

						{/* Details Card */}
						<Card
							sx={{
								border: "none",
								boxShadow: `0 20px 40px ${alpha(
									theme.palette.primary.main,
									0.15
								)}`,
								background: alpha(
									theme.palette.background.paper,
									0.95
								),
								backdropFilter: "blur(20px)",
								borderRadius: 4
							}}
						>
							<CardContent sx={{ p: 4 }}>
								<Box sx={{ mb: 4 }}>
									<Box
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 2,
											mb: 1
										}}
									>
										<Typography
											variant="h5"
											sx={{
												fontWeight: 700,
												color: "text.primary",
												backgroundClip: "text"
											}}
										>
											{t("PersonalInformation")}
										</Typography>
									</Box>
									<Typography
										variant="body2"
										sx={{ color: "text.secondary" }}
									>
										{t(
											"YourPersonalDetailsAndContactInformation"
										)}
									</Typography>
								</Box>

								{/* Profile Details Grid */}
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: {
											xs: "1fr",
											md: "1fr 1fr"
										},
										gap: 3,
										mb: 4
									}}
								>
									{profileDetails.map((detail, index) => {
										const IconComponent = detail.icon
										return (
											<Box
												key={index}
												sx={{
													p: 3,
													borderRadius: 4,
													border: `1px solid ${alpha(
														theme.palette.primary
															.main,
														0.1
													)}`,
													background: alpha(
														theme.palette.primary
															.main,
														0.02
													),
													transition:
														"all 0.3s ease-in-out",
													"&:hover": {
														borderColor: alpha(
															theme.palette
																.primary.main,
															0.2
														),
														boxShadow: `0 8px 24px ${alpha(
															theme.palette
																.primary.main,
															0.1
														)}`,
														transform:
															"translateY(-4px)",
														background: alpha(
															theme.palette
																.primary.main,
															0.05
														)
													}
												}}
											>
												<Box
													sx={{
														display: "flex",
														alignItems:
															"flex-start",
														gap: 2
													}}
												>
													<Box
														sx={{
															width: 36,
															height: 36,
															background: `linear-gradient(135deg, ${alpha(
																theme.palette
																	.primary
																	.main,
																0.1
															)} 0%, ${alpha(
																theme.palette
																	.primary
																	.light,
																0.1
															)} 100%)`,
															borderRadius: 4,
															display: "flex",
															alignItems:
																"center",
															justifyContent:
																"center",
															mx: "auto",
															mb: 2,
															transition:
																"transform 0.3s ease-in-out",
															boxShadow: `0 4px 12px ${alpha(
																theme.palette
																	.primary
																	.main,
																0.1
															)}`,
															border: `1px solid ${alpha(
																theme.palette
																	.primary
																	.main,
																0.2
															)}`,
															"&:hover": {
																transform:
																	"scale(1.1)"
															}
														}}
													>
														<IconComponent
															sx={{
																color: theme
																	.palette
																	.primary
																	.main,
																fontSize:
																	"1.2rem"
															}}
														/>
													</Box>

													<Box
														sx={{
															flex: 1,
															minWidth: 0
														}}
													>
														<Typography
															variant="body2"
															sx={{
																color: theme
																	.palette
																	.primary
																	.main,
																fontWeight: 600,
																display:
																	"block",
																mb: 0.5
															}}
														>
															{t(detail.label)}
														</Typography>
														<Typography
															variant="body2"
															sx={{
																color: "text.primary",
																fontWeight: 500,
																wordBreak:
																	"break-word"
															}}
														>
															{detail.value}
														</Typography>
													</Box>
												</Box>
											</Box>
										)
									})}
								</Box>

								{/* Action Buttons */}
								<Stack
									direction={{ xs: "column", sm: "row" }}
									spacing={2}
									sx={{
										paddingTop: 4,
										borderTop: `1px solid ${alpha(
											theme.palette.primary.main,
											0.1
										)}`
									}}
								>
									<Button
										variant="contained"
										startIcon={<Edit />}
										sx={{
											flex: 1,
											textTransform: "none",
											fontWeight: 500,
											backgroundColor:
												theme.palette.primary.main,
											"&:hover": {
												backgroundColor:
													theme.palette.primary.dark
											}
										}}
									>
										{t("EditProfile")}
									</Button>
									<Button
										variant="outlined"
										startIcon={<Key />}
										onClick={handleChangePassword}
										sx={{
											flex: 1,
											textTransform: "none",
											fontWeight: 500,
											borderColor: alpha(
												theme.palette.primary.main,
												0.5
											),
											color: theme.palette.primary.main,
											"&:hover": {
												borderColor:
													theme.palette.primary.main,
												backgroundColor: alpha(
													theme.palette.primary.main,
													0.05
												)
											}
										}}
									>
										{t("ChangePassword")}
									</Button>
									<Button
										variant="outlined"
										startIcon={<Logout />}
										onClick={handleLogout}
										sx={{
											flex: 1,
											textTransform: "none",
											fontWeight: 500,
											borderColor: alpha(
												theme.palette.error.main,
												0.5
											),
											color: theme.palette.error.main,
											"&:hover": {
												borderColor:
													theme.palette.error.main,
												backgroundColor: alpha(
													theme.palette.error.main,
													0.05
												)
											}
										}}
									>
										{t("Logout")}
									</Button>
								</Stack>
							</CardContent>
						</Card>
					</Box>

					{/* Stats Cards */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								md: "repeat(3, 1fr)"
							},
							gap: 3
						}}
					>
						{statsData.map((stat, index) => {
							const IconComponent = stat.icon
							return (
								<Card
									key={index}
									sx={{
										border: "none",
										boxShadow: `0 12px 24px ${alpha(
											theme.palette.primary.main,
											0.1
										)}`,
										background: alpha(
											theme.palette.background.paper,
											0.95
										),
										backdropFilter: "blur(20px)",
										borderRadius: 4,
										transition: "all 0.5s ease-in-out",
										"&:hover": {
											boxShadow: `0 20px 40px ${alpha(
												theme.palette.primary.main,
												0.2
											)}`,
											transform: "translateY(-8px)"
										},
										overflow: "hidden",
										position: "relative"
									}}
								>
									<CardContent
										sx={{
											p: 3,
											textAlign: "center",
											position: "relative"
										}}
									>
										{/* Background decoration */}
										<Box
											sx={{
												position: "absolute",
												top: 0,
												right: 0,
												width: 96,
												height: 96,
												background: `linear-gradient(135deg, ${alpha(
													theme.palette.primary.main,
													0.1
												)} 0%, ${alpha(
													theme.palette.primary.light,
													0.1
												)} 100%)`,
												borderRadius: "50%",
												transform:
													"translate(48px, -48px)",
												opacity: 0.3,
												transition:
													"transform 0.5s ease-in-out",
												"&:hover": {
													transform:
														"translate(48px, -48px) scale(1.5)"
												}
											}}
										/>

										{/* Floating elements */}
										<Box
											sx={{
												position: "absolute",
												top: 16,
												left: 16,
												width: 8,
												height: 8,
												background: alpha(
													theme.palette.primary.main,
													0.3
												),
												borderRadius: "50%",
												opacity: 0.6,
												animation:
													"bounce 2s ease-in-out infinite"
											}}
										/>

										<Box
											sx={{
												width: 64,
												height: 64,
												background: `linear-gradient(135deg, ${alpha(
													theme.palette.primary.main,
													0.1
												)} 0%, ${alpha(
													theme.palette.primary.light,
													0.1
												)} 100%)`,
												borderRadius: 4,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												mx: "auto",
												mb: 2,
												transition:
													"transform 0.3s ease-in-out",
												boxShadow: `0 4px 12px ${alpha(
													theme.palette.primary.main,
													0.1
												)}`,
												border: `1px solid ${alpha(
													theme.palette.primary.main,
													0.2
												)}`,
												"&:hover": {
													transform: "scale(1.1)"
												}
											}}
										>
											<IconComponent
												sx={{
													color: theme.palette.primary
														.main,
													fontSize: "2rem"
												}}
											/>
										</Box>

										<Typography
											variant="h6"
											sx={{
												fontWeight: 600,
												color: "text.primary",
												mb: 1
											}}
										>
											{stat.title}
										</Typography>

										<Typography
											variant="h4"
											sx={{
												fontWeight: 700,
												background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor:
													"transparent",
												mb: 1,
												transition:
													"transform 0.3s ease-in-out",
												"&:hover": {
													transform: "scale(1.1)"
												}
											}}
										>
											{stat.value}
										</Typography>

										<Typography
											variant="body2"
											sx={{ color: "text.secondary" }}
										>
											{stat.subtitle}
										</Typography>

										{/* Achievement badge */}
										<Box
											sx={{
												position: "absolute",
												top: 16,
												right: 16,
												opacity: 0,
												transition:
													"opacity 0.3s ease-in-out",
												"&:hover": { opacity: 1 }
											}}
										>
											<EmojiEvents
												sx={{
													color: theme.palette.primary
														.main,
													fontSize: "1.25rem"
												}}
											/>
										</Box>
									</CardContent>
								</Card>
							)
						})}
					</Box>
				</Box>
			</Box>
		</>
	)
}
