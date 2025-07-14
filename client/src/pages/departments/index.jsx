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
import CustomAvatar from "~/components/custom-avatar"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Edit, GroupAdd, Business as BusinessIcon } from "@mui/icons-material"

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
		<Box>
			<Container maxWidth="xl">
				{/* Minimalist Header */}
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
							width: 80,
							height: 80,
							borderRadius: "50%",
							bgcolor: alpha(theme.palette.primary.main, 0.1),
							mb: 1
						}}
					>
						<BusinessIcon
							sx={{
								fontSize: 40,
								color: theme.palette.primary.main
							}}
						/>
					</Box>
					<Typography
						variant="h4"
						sx={{
							fontWeight: 600,
							color: theme.palette.primary.main,
							mb: 1,
							letterSpacing: "-0.02em"
						}}
					>
						{t("departments")}
					</Typography>
					<Typography
						variant="body1"
						sx={{
							color: theme.palette.text.secondary,
							fontWeight: 400,
							maxWidth: 600,
							mx: "auto"
						}}
					>
						{t(
							"manage-departments-and-monitor-department-activities"
						)}
					</Typography>
				</Box>

				{/* Clean Search Section */}
				<Box
					sx={{
						mb: 6,
						display: "flex",
						gap: 3,
						flexDirection: { xs: "column", md: "row" },
						alignItems: { xs: "stretch", md: "center" },
						maxWidth: 800,
						mx: "auto"
					}}
				>
					<TextField
						size="small"
						label={t("search")}
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
									<SearchIcon
										sx={{
											fontSize: 20
										}}
									/>
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
							LinkComponent={Link}
							to="/departments/add"
							variant="contained"
							size="small"
							startIcon={<AddIcon />}
							sx={{
								whiteSpace: "nowrap",
								textTransform: "none",
								px: 4,
								py: 1,
								borderRadius: 2
							}}
						>
							{t("add-new-department")}
						</Button>
					)}
				</Box>

				{/* Clean Department Cards */}
				{!loading && departments.length > 0 && (
					<Grid container spacing={4} sx={{ mb: 6 }}>
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
											borderRadius: 3,
											bgcolor: "white",
											boxShadow:
												"0 0 15px rgba(0, 0, 0, 0.15)",
											transition:
												"all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
											"&:hover": {
												boxShadow: `0 20px 30px ${alpha(
													theme.palette.primary.main,
													0.15
												)}`,
												borderColor: alpha(
													theme.palette.primary.main,
													0.3
												),
												"& .department-image": {
													transform: "scale(1.02)"
												},
												"& .department-actions": {
													opacity: 1,
													transform: "translateY(0)"
												}
											}
										}}
									>
										{/* Clean Image Section with Action Buttons */}
										<Box
											sx={{
												position: "relative",
												overflow: "hidden"
											}}
										>
											<CardMedia
												component="img"
												height="200"
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
														"transform 0.3s ease"
												}}
											/>
											<Box
												sx={{
													position: "absolute",
													top: 0,
													left: 0,
													right: 0,
													bottom: 0,
													background: `linear-gradient(to bottom, transparent 0%, ${alpha(
														theme.palette.primary
															.main,
														0.05
													)} 100%)`
												}}
											/>

											{/* Action Buttons - Positioned on top-right corner */}
											{account.role === "ADMIN" && (
												<Box
													className="department-actions"
													sx={{
														position: "absolute",
														top: 12,
														right: 12,
														display: "flex",
														gap: 1,
														opacity: 0,
														transform:
															"translateY(-10px)",
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
																"blur(10px)",
															border: `1px solid ${alpha(
																theme.palette
																	.primary
																	.main,
																0.2
															)}`,
															color: theme.palette
																.primary.main,
															width: 36,
															height: 36,
															"&:hover": {
																bgcolor:
																	"white",
																borderColor:
																	theme
																		.palette
																		.primary
																		.main,
																transform:
																	"scale(1.1)"
															}
														}}
													>
														<GroupAdd
															sx={{
																fontSize: 18
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
																"blur(10px)",
															border: `1px solid ${alpha(
																theme.palette
																	.primary
																	.main,
																0.2
															)}`,
															color: theme.palette
																.primary.main,
															width: 36,
															height: 36,
															"&:hover": {
																bgcolor:
																	"white",
																borderColor:
																	theme
																		.palette
																		.primary
																		.main,
																transform:
																	"scale(1.1)"
															}
														}}
													>
														<Edit
															sx={{
																fontSize: 18
															}}
														/>
													</IconButton>
												</Box>
											)}
										</Box>

										<CardContent sx={{ flexGrow: 1, p: 3 }}>
											{/* Department Name */}
											<Typography
												variant="h5"
												sx={{
													fontWeight: 600,
													mb: 1,
													color: theme.palette.primary
														.main,
													fontSize: "1.3rem",
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
													mb: 3,
													lineHeight: 1.6,
													display: "-webkit-box",
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical",
													overflow: "hidden"
												}}
											>
												{department.description}
											</Typography>

											{/* Manager Info */}
											<Box sx={{ mb: 3 }}>
												<Typography
													variant="caption"
													sx={{
														color: theme.palette
															.primary.main,
														fontWeight: 600,
														textTransform:
															"uppercase",
														letterSpacing: "1px",
														mb: 1,
														display: "block"
													}}
												>
													{t("head-of-department")}
												</Typography>
												<Stack
													direction="row"
													alignItems="center"
													spacing={2}
												>
													<CustomAvatar
														src={
															department.hod
																.avatar
														}
														sx={{
															width: 48,
															height: 48,
															border: `2px solid ${alpha(
																theme.palette
																	.primary
																	.main,
																0.2
															)}`
														}}
													/>
													<Box>
														<Typography
															variant="body1"
															sx={{
																fontWeight: 500,
																color: theme
																	.palette
																	.text
																	.primary,
																fontSize: "1rem"
															}}
														>
															{department.hod
																.firstName +
																" " +
																department.hod
																	.lastName}
														</Typography>
													</Box>
												</Stack>
											</Box>

											{/* Employee Count - Below manager info */}
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													py: 2,
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

				{/* Clean Empty State */}
				{!loading && departments.length === 0 && (
					<Fade in={true} timeout={600}>
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								py: 12,
								px: 4,
								textAlign: "center"
							}}
						>
							<Box
								sx={{
									width: 120,
									height: 120,
									borderRadius: "50%",
									bgcolor: alpha(
										theme.palette.primary.main,
										0.1
									),
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									mb: 4
								}}
							>
								<FolderOffIcon
									sx={{
										fontSize: 48,
										color: theme.palette.primary.main
									}}
								/>
							</Box>
							<Typography
								variant="h5"
								sx={{
									fontWeight: 500,
									color: theme.palette.primary.main,
									mb: 2
								}}
							>
								{t("department-not-found")}
							</Typography>
							<Typography
								variant="body1"
								sx={{
									color: theme.palette.text.secondary,
									maxWidth: 480,
									lineHeight: 1.6,
									mb: 4
								}}
							>
								{t("department-not-found-long")}
							</Typography>
						</Box>
					</Fade>
				)}

				{/* Clean Loading State */}
				{loading && (
					<Grid container spacing={4} sx={{ mb: 6 }}>
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
										borderRadius: 3,
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
										height={200}
										animation="wave"
									/>
									<CardContent sx={{ flexGrow: 1, p: 4 }}>
										<Skeleton
											variant="text"
											width="70%"
											height={32}
											sx={{ mb: 2 }}
											animation="wave"
										/>
										<Skeleton
											variant="text"
											width="100%"
											height={20}
											sx={{ mb: 1 }}
											animation="wave"
										/>
										<Skeleton
											variant="text"
											width="80%"
											height={20}
											sx={{ mb: 4 }}
											animation="wave"
										/>
										<Skeleton
											variant="text"
											width="50%"
											height={16}
											sx={{ mb: 2 }}
											animation="wave"
										/>
										<Stack
											direction="row"
											alignItems="center"
											spacing={2}
											sx={{ mb: 3 }}
										>
											<Skeleton
												variant="circular"
												width={48}
												height={48}
												animation="wave"
											/>
											<Skeleton
												variant="text"
												width="60%"
												height={20}
												animation="wave"
											/>
										</Stack>
										<Skeleton
											variant="rectangular"
											width="100%"
											height={48}
											sx={{ borderRadius: 2 }}
											animation="wave"
										/>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				)}

				{/* Clean Pagination */}
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 6
					}}
				>
					<Pagination
						count={totalPage}
						page={pageNumber}
						onChange={handlePageChange}
						color="primary"
					/>
				</Box>
			</Container>
		</Box>
	)
}
