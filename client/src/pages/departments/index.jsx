import { useCallback, useEffect, useState } from "react"
import {
	Box,
	Card,
	CardContent,
	CardMedia,
	Typography,
	TextField,
	Grid,
	Pagination,
	useTheme,
	Stack,
	alpha,
	InputAdornment,
	Skeleton,
	Button,
	IconButton,
	Fade,
	Container
} from "@mui/material"
import GroupIcon from "@mui/icons-material/Group"
import SearchIcon from "@mui/icons-material/Search"
import FolderOffIcon from "@mui/icons-material/FolderOff"
import AddIcon from "@mui/icons-material/Add"
import { useDispatch, useSelector } from "react-redux"
import { getDepartmentsPageApi } from "~/services/department.service"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Edit, GroupAdd, Business as BusinessIcon } from "@mui/icons-material"
import CustomAvatar from "~/components/custom-avatar"

export default function DepartmentPage() {
	const theme = useTheme()
	const dispatch = useDispatch()
	const { t } = useTranslation("department_page")
	const account = useSelector((state) => state.account.value)

	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [totalPage, setTotalPage] = useState(0)
	const [pageNumber, setPageNumber] = useState(1)
	const [departments, setDepartments] = useState([])

	const handlePageChange = (event, value) => {
		setPageNumber(value)
	}

	const handleGetAccountsPage = useCallback(async () => {
		const res = await getDepartmentsPageApi({
			pageNumber,
			searchTerm
		})
		if (res.status === 200) {
			setDepartments(res.data.departments)
			setTotalPage(res.data.totalPage)
		} else {
			dispatch(setPopup({ type: "error", message: res.message }))
		}
		setLoading(false)
	}, [pageNumber, searchTerm, dispatch])

	useEffect(() => {
		setPageNumber(1)
	}, [searchTerm])

	useEffect(() => {
		setLoading(true)
		const delayDebounce = setTimeout(() => {
			handleGetAccountsPage()
		}, 500)
		return () => clearTimeout(delayDebounce)
	}, [pageNumber, searchTerm, handleGetAccountsPage])

	return (
		<>
			<title>{t("departments")}</title>
			<Box>
				{/* Header */}
				<Box
					sx={{
						mb: 3,
						textAlign: "center"
					}}
				>
					<Box
						sx={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							width: 64,
							height: 64,
							borderRadius: "50%",
							bgcolor: alpha(theme.palette.primary.main, 0.1),
							mb: 1
						}}
					>
						<BusinessIcon
							sx={{
								fontSize: 32,
								color: theme.palette.primary.main
							}}
						/>
					</Box>
					<Typography
						variant="h4"
						sx={{
							fontWeight: 600,
							color: theme.palette.primary.main,
							mb: 0.5,
							letterSpacing: "-0.02em"
						}}
					>
						{t("departments")}
					</Typography>
					<Typography
						variant="body2"
						sx={{
							color: theme.palette.text.secondary,
							fontWeight: 400,
							maxWidth: 500,
							mx: "auto"
						}}
					>
						{t(
							"manage-departments-and-monitor-department-activities"
						)}
					</Typography>
				</Box>

				{/* Search Section */}
				<Box
					sx={{
						mb: 4,
						display: "flex",
						gap: 2,
						flexDirection: { xs: "column", md: "row" },
						alignItems: { xs: "stretch", md: "center" },
						maxWidth: 700,
						mx: "auto"
					}}
				>
					<TextField
						label={t("search")}
						size="small"
						placeholder={`${t(
							"enter-the-name-or-description-of-the-department"
						)}...`}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						fullWidth
						variant="outlined"
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon sx={{ fontSize: 18 }} />
								</InputAdornment>
							)
						}}
						sx={{
							"& .MuiOutlinedInput-root": {
								borderRadius: 2,
								bgcolor: "white"
							}
						}}
					/>
					{account.role === "ADMIN" && (
						<Button
							size="medium"
							LinkComponent={Link}
							to="/departments/add"
							variant="contained"
							startIcon={<AddIcon />}
							sx={{
								height: "100%",
								whiteSpace: "nowrap",
								textTransform: "none",
								px: 4,
								borderRadius: 2
							}}
						>
							{t("add-new-department")}
						</Button>
					)}
				</Box>

				{/* Compact Department Cards */}
				{!loading && departments.length > 0 && (
					<Grid container spacing={3} sx={{ mb: 4 }}>
						{departments.map((department, index) => (
							<Grid
								size={{ xs: 12, sm: 6, lg: 4 }}
								key={department.id}
							>
								<Fade in={true} timeout={300 + index * 100}>
									<Card
										sx={{
											height: "100%",
											display: "flex",
											flexDirection: "column",
											borderRadius: 2.5,
											bgcolor: "white",
											boxShadow:
												"0 2px 12px rgba(0, 0, 0, 0.08)",
											border: `1px solid ${alpha(
												theme.palette.divider,
												0.1
											)}`,
											transition:
												"all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
											"&:hover": {
												boxShadow: `0 8px 25px ${alpha(
													theme.palette.primary.main,
													0.15
												)}`,
												borderColor: alpha(
													theme.palette.primary.main,
													0.3
												),
												transform: "translateY(-2px)",
												"& .department-image": {
													transform: "scale(1.05)"
												},
												"& .department-actions": {
													opacity: 1,
													transform: "translateY(0)"
												}
											}
										}}
									>
										{/* Compact Image Section */}
										<Box
											sx={{
												position: "relative",
												overflow: "hidden",
												height: 140
											}}
										>
											<CardMedia
												component="img"
												height="140"
												image={`${
													import.meta.env
														.VITE_SERVER_URL
												}/api/${department.image}`}
												alt={department.name}
												className="department-image"
												onError={(e) => {
													e.target.onerror = null
													e.target.src =
														"/images/placeholder.svg"
												}}
												sx={{
													transition:
														"transform 0.3s ease",
													objectFit: "cover"
												}}
											/>

											{/* Gradient Overlay */}
											<Box
												sx={{
													position: "absolute",
													top: 0,
													left: 0,
													right: 0,
													bottom: 0,
													background: `linear-gradient(135deg, transparent 0%, ${alpha(
														theme.palette.primary
															.main,
														0.1
													)} 100%)`
												}}
											/>

											{/* Action Buttons */}
											{account.role === "ADMIN" && (
												<Box
													className="department-actions"
													sx={{
														position: "absolute",
														top: 8,
														right: 8,
														display: "flex",
														gap: 0.5,
														opacity: 0,
														transform:
															"translateY(-8px)",
														transition:
															"all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
													}}
												>
													<IconButton
														LinkComponent={Link}
														to={`/departments/add-employees/${department.id}`}
														size="small"
														sx={{
															bgcolor:
																"rgba(255, 255, 255, 0.95)",
															backdropFilter:
																"blur(8px)",
															color: theme.palette
																.primary.main,
															width: 32,
															height: 32,
															"&:hover": {
																bgcolor:
																	"white",
																transform:
																	"scale(1.1)"
															}
														}}
													>
														<GroupAdd
															sx={{
																fontSize: 16
															}}
														/>
													</IconButton>
													<IconButton
														LinkComponent={Link}
														to={`/departments/edit/${department.id}`}
														size="small"
														sx={{
															bgcolor:
																"rgba(255, 255, 255, 0.95)",
															backdropFilter:
																"blur(8px)",
															color: theme.palette
																.primary.main,
															width: 32,
															height: 32,
															"&:hover": {
																bgcolor:
																	"white",
																transform:
																	"scale(1.1)"
															}
														}}
													>
														<Edit
															sx={{
																fontSize: 16
															}}
														/>
													</IconButton>
												</Box>
											)}
										</Box>

										{/* Compact Content */}
										<CardContent
											sx={{ flexGrow: 1, p: 2.5, pb: 2 }}
										>
											{/* Department Name */}
											<Typography
												variant="h6"
												sx={{
													fontWeight: 600,
													mb: 1,
													color: theme.palette.primary
														.main,
													fontSize: "1.1rem",
													lineHeight: 1.3
												}}
											>
												{department.name}
											</Typography>

											{/* Description */}
											<Typography
												variant="body2"
												sx={{
													color: theme.palette.text
														.secondary,
													mb: 2,
													lineHeight: 1.4,
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
													overflow: "hidden",
													fontSize: "0.875rem"
												}}
											>
												{department.description}
											</Typography>

											{/* Compact Manager Info */}
											<Box>
												<Typography
													variant="caption"
													sx={{
														color: theme.palette
															.text.secondary,
														fontWeight: 500,
														textTransform:
															"uppercase",
														letterSpacing: "0.5px",
														mb: 1,
														display: "block",
														fontSize: "0.7rem"
													}}
												>
													{t("head-of-department")}
												</Typography>
												<Stack
													direction="row"
													alignItems="center"
													spacing={1.5}
												>
													<CustomAvatar
														src={
															department.hod
																.avatar
														}
														sx={{
															width: 36,
															height: 36,
															border: `2px solid ${alpha(
																theme.palette
																	.primary
																	.main,
																0.2
															)}`
														}}
													/>
													<Typography
														variant="body2"
														sx={{
															fontWeight: 500,
															color: theme.palette
																.text.primary,
															fontSize: "0.875rem"
														}}
													>
														{department.hod
															.firstName +
															" " +
															department.hod
																.lastName}
													</Typography>
												</Stack>
											</Box>

											{/* Employee Count - Below manager info */}
											<Box
												sx={{
													mt: 2,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													py: 1,
													px: 3,
													borderRadius: 2,
													bgcolor: alpha(
														theme.palette.primary
															.main,
														0.05
													),
													border: `1px solid ${alpha(
														theme.palette.primary
															.main,
														0.1
													)}`
												}}
											>
												<GroupIcon
													sx={{
														mr: 1,
														color: theme.palette
															.primary.main,
														fontSize: 20
													}}
												/>
												<Typography
													variant="body2"
													sx={{
														fontWeight: 600,
														color: theme.palette
															.primary.main
													}}
												>
													{department.employeeCount}{" "}
													{t("members")}
												</Typography>
											</Box>
										</CardContent>
									</Card>
								</Fade>
							</Grid>
						))}
					</Grid>
				)}

				{/* Empty State */}
				{!loading && departments.length === 0 && (
					<Fade in={true} timeout={600}>
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								py: 8,
								px: 4,
								textAlign: "center"
							}}
						>
							<Box
								sx={{
									width: 80,
									height: 80,
									borderRadius: "50%",
									bgcolor: alpha(
										theme.palette.primary.main,
										0.1
									),
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									mb: 3
								}}
							>
								<FolderOffIcon
									sx={{
										fontSize: 36,
										color: theme.palette.primary.main
									}}
								/>
							</Box>
							<Typography
								variant="h6"
								sx={{
									fontWeight: 500,
									color: theme.palette.primary.main,
									mb: 1
								}}
							>
								{t("department-not-found")}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: theme.palette.text.secondary,
									maxWidth: 400,
									lineHeight: 1.5
								}}
							>
								{t("department-not-found-long")}
							</Typography>
						</Box>
					</Fade>
				)}

				{/* Loading State */}
				{loading && (
					<Grid container spacing={3} sx={{ mb: 4 }}>
						{Array.from({ length: 6 }).map((_, index) => (
							<Grid
								size={{ xs: 12, sm: 6, lg: 4 }}
								key={`skeleton-${index}`}
							>
								<Card
									sx={{
										height: "100%",
										display: "flex",
										flexDirection: "column",
										borderRadius: 2.5,
										overflow: "hidden",
										bgcolor: "white",
										border: `1px solid ${alpha(
											theme.palette.primary.main,
											0.1
										)}`
									}}
								>
									<Skeleton
										variant="rectangular"
										height={140}
										animation="wave"
									/>
									<CardContent sx={{ flexGrow: 1, p: 2.5 }}>
										<Skeleton
											variant="text"
											width="70%"
											height={28}
											sx={{ mb: 1 }}
											animation="wave"
										/>
										<Skeleton
											variant="text"
											width="100%"
											height={16}
											sx={{ mb: 0.5 }}
											animation="wave"
										/>
										<Skeleton
											variant="text"
											width="80%"
											height={16}
											sx={{ mb: 2 }}
											animation="wave"
										/>
										<Skeleton
											variant="text"
											width="40%"
											height={12}
											sx={{ mb: 1 }}
											animation="wave"
										/>
										<Stack
											direction="row"
											alignItems="center"
											spacing={1.5}
										>
											<Skeleton
												variant="circular"
												width={36}
												height={36}
												animation="wave"
											/>
											<Skeleton
												variant="text"
												width="60%"
												height={16}
												animation="wave"
											/>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				)}

				{/* Pagination */}
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 4
					}}
				>
					<Pagination
						count={totalPage}
						page={pageNumber}
						showFirstButton
						showLastButton
						onChange={handlePageChange}
						color="primary"
					/>
				</Box>
			</Box>
		</>
	)
}
