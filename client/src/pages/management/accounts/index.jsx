import { useCallback, useEffect, useState } from "react"
import {
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Box,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TableSortLabel,
	useTheme,
	InputAdornment,
	Stack,
	Card,
	CardContent,
	Divider,
	alpha,
	IconButton,
	Tooltip,
	Skeleton,
	Pagination,
	Button
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { formatLongDate } from "~/utils/function"
import CustomAvatar from "~/components/custom-avatar"
import { getAccountsPageApi } from "~/services/account.service"
import SearchIcon from "@mui/icons-material/Search"
import PersonIcon from "@mui/icons-material/Person"
import MoreIcon from "@mui/icons-material/MoreVert"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import GroupIcon from "@mui/icons-material/Group"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import EmojiEvents from "@mui/icons-material/EmojiEvents"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon from "@mui/icons-material/Cancel"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { useDispatch } from "react-redux"
import { ROLE_CONFIGS } from "~/constants/account.constants"
import RoleChip from "~/components/role-chip"
import AddIcon from "@mui/icons-material/Add"
import { Link } from "react-router-dom"

// Enhanced Status Component
const StatusIndicator = ({ enabled, t, theme }) => {
	return (
		<Box
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 1,
				px: 2,
				py: 0.75,
				borderRadius: 3,
				background: enabled
					? `linear-gradient(135deg, ${alpha(
							theme.palette.success.main,
							0.1
					  )} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`
					: `linear-gradient(135deg, ${alpha(
							theme.palette.error.main,
							0.1
					  )} 0%, ${alpha(theme.palette.error.light, 0.05)} 100%)`,
				border: `1px solid ${
					enabled
						? alpha(theme.palette.success.main, 0.2)
						: alpha(theme.palette.error.main, 0.2)
				}`,
				position: "relative",
				overflow: "hidden",
				transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				"&:hover": {
					transform: "translateY(-1px)",
					boxShadow: enabled
						? `0 4px 12px ${alpha(
								theme.palette.success.main,
								0.15
						  )}`
						: `0 4px 12px ${alpha(theme.palette.error.main, 0.15)}`,
					background: enabled
						? `linear-gradient(135deg, ${alpha(
								theme.palette.success.main,
								0.15
						  )} 0%, ${alpha(
								theme.palette.success.light,
								0.08
						  )} 100%)`
						: `linear-gradient(135deg, ${alpha(
								theme.palette.error.main,
								0.15
						  )} 0%, ${alpha(
								theme.palette.error.light,
								0.08
						  )} 100%)`
				},
				"&::before": {
					content: '""',
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: "2px",
					background: enabled
						? `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`
						: `linear-gradient(90deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`,
					opacity: 0.8
				}
			}}
		>
			{/* Animated dot */}
			<Box
				sx={{
					position: "relative",
					display: "flex",
					alignItems: "center",
					justifyContent: "center"
				}}
			>
				<Box
					sx={{
						width: 8,
						height: 8,
						borderRadius: "50%",
						backgroundColor: enabled
							? theme.palette.success.main
							: theme.palette.error.main,
						boxShadow: enabled
							? `0 0 8px ${alpha(
									theme.palette.success.main,
									0.4
							  )}`
							: `0 0 8px ${alpha(theme.palette.error.main, 0.4)}`,
						animation: enabled
							? "pulse-success 2s ease-in-out infinite"
							: "pulse-error 2s ease-in-out infinite",
						position: "relative",
						"&::after": {
							content: '""',
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							width: "100%",
							height: "100%",
							borderRadius: "50%",
							backgroundColor: enabled
								? theme.palette.success.main
								: theme.palette.error.main,
							opacity: 0.3,
							animation: enabled
								? "ripple-success 2s ease-in-out infinite"
								: "ripple-error 2s ease-in-out infinite"
						}
					}}
				/>
			</Box>

			{/* Status icon */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					color: enabled
						? theme.palette.success.main
						: theme.palette.error.main,
					fontSize: "1rem",
					opacity: 0.8
				}}
			>
				{enabled ? (
					<CheckCircleIcon sx={{ fontSize: "1rem" }} />
				) : (
					<CancelIcon sx={{ fontSize: "1rem" }} />
				)}
			</Box>

			{/* Status text */}
			<Typography
				variant="body2"
				sx={{
					fontWeight: 600,
					fontSize: "0.75rem",
					color: enabled
						? theme.palette.success.dark
						: theme.palette.error.dark,
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					lineHeight: 1
				}}
			>
				{t(enabled ? "enabled" : "disabled")}
			</Typography>

			{/* Shimmer effect */}
			<Box
				sx={{
					position: "absolute",
					top: 0,
					left: "-100%",
					width: "100%",
					height: "100%",
					background: `linear-gradient(90deg, transparent 0%, ${alpha(
						theme.palette.common.white,
						0.4
					)} 50%, transparent 100%)`,
					animation: "shimmer 3s ease-in-out infinite",
					pointerEvents: "none"
				}}
			/>
		</Box>
	)
}

export default function AccountList() {
	const theme = useTheme()
	const { t, i18n } = useTranslation("accounts_management_page")
	const dispatch = useDispatch()
	const [loading, setLoading] = useState(false)
	const [accounts, setAccounts] = useState([])
	const [stats, setStats] = useState({
		totalAccounts: 0,
		totalEnabled: 0,
		totalAdmin: 0
	})
	const pageSize = 5
	const [totalPage, setTotalPage] = useState(0)
	const [pageNumber, setPageNumber] = useState(1)
	const [searchTerm, setSearchTerm] = useState("")
	const [roleFilter, setRoleFilter] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [sortBy, setSortBy] = useState("desc")

	const handleSort = () => {
		setSortBy(sortBy === "asc" ? "desc" : "asc")
	}

	const handlePageChange = (event, value) => {
		setPageNumber(value)
	}

	const handleGetAccountsPage = useCallback(async () => {
		const res = await getAccountsPageApi({
			pageNumber,
			searchTerm,
			roleFilter,
			statusFilter,
			sortBy
		})
		if (res.status === 200) {
			setAccounts(res.data.accounts)
			setTotalPage(res.data.totalPage)
			setStats({
				totalAccounts: res.data.totalAccounts ?? 0,
				totalEnabled: res.data.totalEnabled ?? 0,
				totalAdmin: res.data.totalAdmin ?? 0
			})
		} else {
			dispatch(setPopup({ type: "error", message: res.message }))
		}
		setLoading(false)
	}, [pageNumber, searchTerm, roleFilter, statusFilter, sortBy, dispatch])

	useEffect(() => {
		setPageNumber(1)
	}, [searchTerm, roleFilter, statusFilter, sortBy])

	useEffect(() => {
		setLoading(true)
		const delayDebounce = setTimeout(() => {
			handleGetAccountsPage()
		}, 500)
		return () => clearTimeout(delayDebounce)
	}, [
		pageNumber,
		searchTerm,
		roleFilter,
		statusFilter,
		sortBy,
		handleGetAccountsPage
	])

	const statsData = [
		{
			title: t("TotalAccounts"),
			value: stats.totalAccounts,
			icon: GroupIcon,
			color: theme.palette.warning.main,
			action: () => {
				setSearchTerm("")
				setRoleFilter("")
				setStatusFilter("")
			}
		},
		{
			title: t("enabled"),
			value: stats.totalEnabled,
			icon: TrendingUpIcon,
			color: theme.palette.primary.main,
			action: () => {
				setSearchTerm("")
				setRoleFilter("")
				setStatusFilter("true")
			}
		},
		{
			title: t("ADMIN"),
			value: stats.totalAdmin,
			icon: AdminPanelSettingsIcon,
			color: theme.palette.error.main,
			action: () => {
				setSearchTerm("")
				setRoleFilter("ADMIN")
				setStatusFilter("")
			}
		}
	]

	return (
		<>
			<title>{t("accounts-management")}</title>

			{/* Add CSS animations */}
			<style>
				{`
                    @keyframes pulse-success {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.6; }
                    }
                    @keyframes pulse-error {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.6; }
                    }
                    @keyframes ripple-success {
                        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
                        100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                    }
                    @keyframes ripple-error {
                        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
                        100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                    }
                    @keyframes shimmer {
                        0% { left: -100%; }
                        100% { left: 100%; }
                    }
                    @keyframes bounce {
                        0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
                        40%, 43% { transform: translate3d(0,-8px,0); }
                        70% { transform: translate3d(0,-4px,0); }
                        90% { transform: translate3d(0,-2px,0); }
                    }
                `}
			</style>

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
							background: alpha(theme.palette.common.white, 0.1),
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
							{t("AccountManagement")}
						</Typography>
						<Typography variant="body2">
							{t("EmployeeAccountManagementAndMonitoringSystem")}
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

				{/* Stats Section */}
				<Box
					sx={{
						p: 4,
						background: `linear-gradient(180deg, ${alpha(
							theme.palette.primary.main,
							0.02
						)} 0%, ${alpha(
							theme.palette.background.paper,
							0.8
						)} 100%)`
					}}
				>
					{/* Stats Cards */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								md: "repeat(3, 1fr)"
							},
							gap: 3,
							mb: 5
						}}
					>
						{statsData.map((stat, index) => {
							const IconComponent = stat.icon
							return (
								<Card
									key={index}
									onClick={stat.action}
									sx={{
										cursor: "pointer",
										border: "none",
										boxShadow: `0 12px 24px ${alpha(
											stat.color,
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
												stat.color,
												0.2
											)}`,
											transform: "translateY(-10px)"
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
													stat.color,
													0.15
												)} 0%, ${alpha(
													stat.color,
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
													stat.color,
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
												width: 45,
												height: 45,
												background: `linear-gradient(135deg, ${alpha(
													stat.color,
													0.15
												)} 0%, ${alpha(
													stat.color,
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
													stat.color,
													0.1
												)}`,
												border: `1px solid ${alpha(
													stat.color,
													0.2
												)}`,
												"&:hover": {
													transform: "scale(1.1)"
												}
											}}
										>
											<IconComponent
												sx={{
													color: stat.color,
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
											variant="h5"
											sx={{
												fontWeight: 700,
												background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color} 100%)`,
												backgroundClip: "text",
												WebkitBackgroundClip: "text",
												WebkitTextFillColor:
													"transparent",
												transition:
													"transform 0.3s ease-in-out",
												"&:hover": {
													transform: "scale(1.1)"
												}
											}}
										>
											{stat.value}
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
													color: stat.color,
													fontSize: "1.25rem"
												}}
											/>
										</Box>
									</CardContent>
								</Card>
							)
						})}
					</Box>

					{/* Controls Section */}
					<Stack spacing={3} direction={{ xs: "column", sm: "row" }}>
						{/* Search Field */}
						<TextField
							size="small"
							label={t("SearchAccount")}
							placeholder={`${t("EnterYourAccountUsername")}...`}
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							fullWidth
							variant="outlined"
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon sx={{ fontSize: 20 }} />
									</InputAdornment>
								)
							}}
						/>
						{/* Filter Controls */}
						<Stack
							direction={{ xs: "column", sm: "row" }}
							spacing={3}
							alignItems={{ xs: "stretch", sm: "flex-start" }}
						>
							{/* Role Filter */}
							<FormControl
								sx={{
									minWidth: { xs: "100%", sm: 200 },
									flex: 1
								}}
							>
								<InputLabel size="small" shrink>
									{t("role")}
								</InputLabel>
								<Select
									displayEmpty
									size="small"
									value={roleFilter}
									label={t("role")}
									onChange={(e) =>
										setRoleFilter(e.target.value)
									}
								>
									<MenuItem value="">
										<Typography color="text.disabled">
											{t("ALL_ROLES")}
										</Typography>
									</MenuItem>
									{ROLE_CONFIGS.map((role) => (
										<MenuItem
											key={role.value}
											value={role.value}
											sx={{ p: 1 }}
										>
											<RoleChip role={role.value} />
										</MenuItem>
									))}
								</Select>
							</FormControl>
							{/* Status Filter */}
							<FormControl
								sx={{
									minWidth: { xs: "100%", sm: 200 },
									flex: 1
								}}
							>
								<InputLabel size="small" shrink>
									{t("status")}
								</InputLabel>
								<Select
									size="small"
									value={statusFilter}
									displayEmpty
									label={t("status")}
									onChange={(e) =>
										setStatusFilter(e.target.value)
									}
								>
									<MenuItem value="">
										<Typography color="text.disabled">
											{t("AllStatus")}
										</Typography>
									</MenuItem>
									<MenuItem value="true">
										<StatusIndicator
											enabled={true}
											t={t}
											theme={theme}
										/>
									</MenuItem>
									<MenuItem value="false">
										<StatusIndicator
											enabled={false}
											t={t}
											theme={theme}
										/>
									</MenuItem>
								</Select>
							</FormControl>
						</Stack>
						<Button
							LinkComponent={Link}
							to="/management/accounts/create"
							variant="contained"
							startIcon={<AddIcon />}
							sx={{
								textWrap: "nowrap",
								px: 5,
								textTransform: "capitalize"
							}}
						>
							{t("AddNew")}
						</Button>
					</Stack>

					{/* Active Filters Display */}
					{(searchTerm || roleFilter || statusFilter) && (
						<Box>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1, mt: 2 }}
							>
								{t("FilterApplied")}:
							</Typography>
							<Stack direction="row" spacing={1} flexWrap="wrap">
								{searchTerm && (
									<Chip
										label={`${t(
											"Search"
										)}: "${searchTerm}"`}
										onDelete={() => setSearchTerm("")}
										color="primary"
										variant="filled"
										size="small"
										sx={{
											backgroundColor: alpha(
												theme.palette.primary.main,
												0.1
											),
											color: theme.palette.primary.main
										}}
									/>
								)}
								{roleFilter && (
									<RoleChip
										role={roleFilter}
										onDelete={() => setRoleFilter("")}
									/>
								)}
								{statusFilter && (
									<Chip
										label={
											statusFilter === "true"
												? t("enabled")
												: t("disabled")
										}
										onDelete={() => setStatusFilter("")}
										color={
											statusFilter === "true"
												? "success"
												: "error"
										}
										variant="filled"
										size="small"
									/>
								)}
							</Stack>
						</Box>
					)}
				</Box>
				<Divider />

				{/* Table Section */}
				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell
									sx={{
										backgroundColor: alpha(
											theme.palette.primary.main,
											0.05
										),
										fontWeight: "bold"
									}}
								>
									ID
								</TableCell>
								<TableCell
									sx={{
										backgroundColor: alpha(
											theme.palette.primary.main,
											0.05
										),
										fontWeight: "bold"
									}}
								>
									{t("account")}
								</TableCell>
								<TableCell
									sx={{
										backgroundColor: alpha(
											theme.palette.primary.main,
											0.05
										),
										fontWeight: "bold"
									}}
								>
									{t("role")}
								</TableCell>
								<TableCell
									sx={{
										backgroundColor: alpha(
											theme.palette.primary.main,
											0.05
										),
										fontWeight: "bold"
									}}
								>
									{t("status")}
								</TableCell>
								<TableCell
									sx={{
										backgroundColor: alpha(
											theme.palette.primary.main,
											0.05
										),
										fontWeight: "bold"
									}}
								>
									<TableSortLabel
										active={true}
										direction={sortBy}
										onClick={() => handleSort()}
									>
										{t("createdAt")}
									</TableSortLabel>
								</TableCell>
								<TableCell
									sx={{
										backgroundColor: alpha(
											theme.palette.primary.main,
											0.05
										),
										fontWeight: "bold"
									}}
								>
									{t("action")}
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody
							sx={{
								minHeight: pageSize * 70
							}}
						>
							{loading ? (
								Array.from({ length: pageSize }).map(
									(_, idx) => (
										<TableRow key={idx}>
											<TableCell sx={{ height: 70 }}>
												<Skeleton
													variant="circular"
													width={32}
													height={32}
												/>
											</TableCell>
											<TableCell>
												<Stack
													direction="row"
													spacing={2}
													alignItems="center"
												>
													<Skeleton
														variant="circular"
														width={40}
														height={40}
													/>
													<Skeleton width={80} />
												</Stack>
											</TableCell>
											<TableCell>
												<Skeleton width={60} />
											</TableCell>
											<TableCell>
												<Skeleton width={60} />
											</TableCell>
											<TableCell>
												<Skeleton width={80} />
											</TableCell>
											<TableCell>
												<Skeleton
													width={24}
													height={24}
												/>
											</TableCell>
										</TableRow>
									)
								)
							) : (
								<>
									{accounts.map((acc) => (
										<TableRow
											key={acc.id}
											hover
											sx={{
												"&:hover": {
													backgroundColor: alpha(
														theme.palette.primary
															.main,
														0.04
													),
													transition:
														"background-color 0.2s ease-in-out"
												},
												"&:nth-of-type(even)": {
													backgroundColor: alpha(
														theme.palette.grey[100],
														0.3
													)
												}
											}}
										>
											<TableCell sx={{ height: 70 }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														justifyContent:
															"center",
														width: 35,
														height: 35,
														borderRadius: "50%",
														backgroundColor: alpha(
															theme.palette
																.primary.main,
															0.1
														),
														color: theme.palette
															.primary.main,
														fontWeight: "bold",
														fontSize: "0.875rem"
													}}
												>
													{acc.id}
												</Box>
											</TableCell>
											<TableCell>
												<Stack
													direction="row"
													spacing={2}
													alignItems="center"
												>
													<CustomAvatar
														src={acc.avatar}
														sx={{
															width: 40,
															height: 40
														}}
													/>
													<Box>
														<Typography
															variant="body1"
															fontWeight="medium"
															sx={{
																lineHeight: 1.2
															}}
														>
															{`${acc.firstName} ${acc.lastName}`}
														</Typography>
														<Typography
															variant="body2"
															color="text.secondary"
															sx={{
																lineHeight: 1.2
															}}
														>
															@{acc.username}
														</Typography>
													</Box>
												</Stack>
											</TableCell>
											<TableCell>
												<RoleChip role={acc.role} />
											</TableCell>
											<TableCell>
												<StatusIndicator
													enabled={acc.enabled}
													t={t}
													theme={theme}
												/>
											</TableCell>
											<TableCell>
												<Box>
													<Typography
														variant="body2"
														fontWeight="medium"
													>
														{formatLongDate(
															acc.createdAt,
															i18n.language
														)}
													</Typography>
													<Typography
														variant="caption"
														color="text.secondary"
													>
														{t("UpdatedAt")}:{" "}
														{formatLongDate(
															acc.updatedAt,
															i18n.language
														)}
													</Typography>
												</Box>
											</TableCell>
											<TableCell>
												<Tooltip title="Thêm tùy chọn">
													<IconButton
														size="small"
														sx={{
															"&:hover": {
																backgroundColor:
																	alpha(
																		theme
																			.palette
																			.primary
																			.main,
																		0.1
																	),
																color: theme
																	.palette
																	.primary
																	.main
															}
														}}
													>
														<MoreIcon />
													</IconButton>
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
									{accounts.length > 0 &&
										accounts.length < pageSize &&
										Array.from({
											length: pageSize - accounts.length
										}).map((_, idx) => (
											<TableRow key={`empty-${idx}`}>
												<TableCell
													colSpan={6}
													sx={{ height: 70 }}
												/>
											</TableRow>
										))}
								</>
							)}
						</TableBody>
					</Table>
				</TableContainer>

				{accounts.length === 0 && !loading && (
					<Box
						sx={{
							py: 8,
							height: 70 * pageSize,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center"
						}}
					>
						<PersonIcon
							sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
						/>
						<Typography
							variant="h6"
							color="text.secondary"
							gutterBottom
						>
							{t("NoAccountsFound")}
						</Typography>
						{(searchTerm || roleFilter || statusFilter) && (
							<Typography variant="body2" color="text.secondary">
								{t("TryChangingYourSearchKeywordsOrFilters")}
							</Typography>
						)}
					</Box>
				)}

				{/* Footer */}
				<Box
					sx={{
						p: 3,
						backgroundColor: alpha(theme.palette.grey[100], 0.3),
						borderTop: `1px solid ${theme.palette.divider}`
					}}
				>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
					>
						<Typography variant="body2" color="text.secondary">
							{t("Showing")} <strong>{accounts.length}</strong> /{" "}
							<strong>{stats.totalAccounts}</strong>{" "}
							{t("Results")}
						</Typography>
						<Pagination
							color="primary"
							count={totalPage}
							page={pageNumber}
							onChange={handlePageChange}
						/>
					</Stack>
				</Box>
			</Paper>
		</>
	)
}
