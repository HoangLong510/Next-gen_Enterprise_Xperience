import { useParams, Link } from "react-router-dom"
import { useCallback, useEffect, useState } from "react"
import {
	Box,
	Paper,
	Typography,
	TextField,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Pagination,
	IconButton,
	InputAdornment,
	Chip,
	Container,
	Stack,
	Button,
	ToggleButtonGroup,
	ToggleButton,
	Card,
	CardContent,
	Fade,
	useTheme,
	alpha,
	Skeleton
} from "@mui/material"
import {
	Search as SearchIcon,
	Add as AddIcon,
	Remove as RemoveIcon,
	ArrowBack as ArrowBackIcon,
	FilterList as FilterListIcon,
	People as PeopleIcon,
	PersonAdd as PersonAddIcon,
	PersonRemove as PersonRemoveIcon
} from "@mui/icons-material"
import CustomAvatar from "~/components/custom-avatar"
import { getEmployeesToAddToDepartmentApi } from "~/services/employee.service"
import { useDispatch } from "react-redux"
import { setPopup } from "~/libs/features/popup/popupSlice"
import {
	getDepartmentByIdApi,
	toggleEmployeeToDepartmentApi
} from "~/services/department.service"
import { useTranslation } from "react-i18next"

export default function AddEmployeeDepartmentPage() {
	const { id } = useParams()
	const theme = useTheme()
	const dispatch = useDispatch()
	const { t } = useTranslation("department_page")

	const [departmentName, setDepartmentName] = useState("")
	const [employees, setEmployees] = useState([])
	const [totalPage, setTotalPage] = useState(0)
	const [pageNumber, setPageNumber] = useState(1)
	const [searchTerm, setSearchTerm] = useState("")
	const [filterInDepartment, setFilterInDepartment] = useState("")
	const [loading, setLoading] = useState(false)

	const handlePageChange = (event, value) => {
		setPageNumber(value)
	}

	const handleFilterChange = (event, newFilter) => {
		if (newFilter !== null) {
			setFilterInDepartment(newFilter)
		}
	}

	const handleToggleDepartment = async (employeeId) => {
		const res = await toggleEmployeeToDepartmentApi({
			id,
			employeeId
		})
		if (res.status === 200) {
			dispatch(setPopup({ type: "success", message: res.message }))
			setEmployees((prev) =>
				prev.map((employee) =>
					employee.id === employeeId
						? { ...employee, inDepartment: !employee.inDepartment }
						: employee
				)
			)
		} else {
			dispatch(setPopup({ type: "error", message: res.message }))
		}
	}

	const handleFetchData = useCallback(async () => {
		const res = await getEmployeesToAddToDepartmentApi({
			id,
			pageNumber,
			searchTerm,
			filterInDepartment
		})
		if (res.status === 200) {
			setEmployees(res.data.employees)
			setTotalPage(res.data.totalPage)
		} else {
			dispatch(setPopup({ type: "error", message: res.message }))
		}
		setLoading(false)
	}, [pageNumber, searchTerm, filterInDepartment, dispatch, id])

	const handleGetDepartmentById = async () => {
		setLoading(true)
		const res = await getDepartmentByIdApi(id)
		setLoading(false)
		if (res.status === 200) {
			setDepartmentName(res.data.name)
		}
	}

	useEffect(() => {
		setPageNumber(1)
	}, [searchTerm, filterInDepartment])

	useEffect(() => {
		setLoading(true)
		const delayDebounce = setTimeout(() => {
			handleFetchData()
		}, 500)
		return () => clearTimeout(delayDebounce)
	}, [pageNumber, searchTerm, filterInDepartment, handleFetchData])

	useEffect(() => {
		handleGetDepartmentById()
	}, [])

	return (
		<>
			<title>{t("department-members-management")}</title>
			<Box>
				{/* Header Section */}
				<Box sx={{ mb: 4 }}>
					<Button
						LinkComponent={Link}
						to="/departments"
						startIcon={<ArrowBackIcon />}
						sx={{
							mb: 3,
							textTransform: "none",
							color: theme.palette.primary.main,
							"&:hover": {
								bgcolor: alpha(theme.palette.primary.main, 0.05)
							}
						}}
					>
						{t("back")}
					</Button>

					<Paper
						elevation={0}
						sx={{
							p: 4,
							borderRadius: 3,
							background: `linear-gradient(135deg, ${
								theme.palette.primary.main
							} 0%, ${alpha(
								theme.palette.primary.main,
								0.8
							)} 100%)`,
							color: "white",
							position: "relative",
							overflow: "hidden",
							"&::before": {
								content: '""',
								position: "absolute",
								top: -50,
								right: -50,
								width: 200,
								height: 200,
								background: alpha(
									theme.palette.common.white,
									0.1
								),
								borderRadius: "50%"
							}
						}}
					>
						<Box sx={{ position: "relative", zIndex: 1 }}>
							<Stack
								direction="row"
								alignItems="center"
								spacing={2}
							>
								<Box
									sx={{
										width: 56,
										height: 56,
										borderRadius: 2,
										bgcolor: alpha(
											theme.palette.common.white,
											0.2
										),
										display: "flex",
										alignItems: "center",
										justifyContent: "center"
									}}
								>
									<PeopleIcon sx={{ fontSize: 28 }} />
								</Box>
								<Box>
									<Typography
										variant="h5"
										sx={{ fontWeight: 700, mb: 1 }}
									>
										{departmentName}
									</Typography>
									<Typography
										variant="body1"
										sx={{ opacity: 0.9 }}
									>
										{t("department-members-management")}
									</Typography>
								</Box>
							</Stack>
						</Box>
					</Paper>
				</Box>

				{/* Search and Filter Section */}
				<Card
					elevation={0}
					sx={{
						mb: 4,
						borderRadius: 3,
						border: `1px solid ${alpha(
							theme.palette.primary.main,
							0.1
						)}`
					}}
				>
					<CardContent sx={{ p: 3 }}>
						<Stack spacing={3}>
							{/* Search Field */}
							<TextField
								fullWidth
								size="small"
								placeholder={`${t(
									"enter-employees-to-search"
								)}...`}
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon
												sx={{
													fontSize: 24
												}}
											/>
										</InputAdornment>
									)
								}}
								sx={{
									"& .MuiOutlinedInput-root": {
										borderRadius: 2
									}
								}}
							/>

							{/* Filter Section */}
							<Box>
								<Stack
									direction="row"
									alignItems="center"
									spacing={2}
									sx={{ mb: 2 }}
								>
									<FilterListIcon
										sx={{
											color: theme.palette.primary.main
										}}
									/>
									<Typography
										variant="body2"
										sx={{
											color: theme.palette.primary.main,
											fontWeight: 600
										}}
									>
										{t("filter-by-status")}
									</Typography>
								</Stack>

								<ToggleButtonGroup
									value={filterInDepartment}
									exclusive
									onChange={handleFilterChange}
									sx={{
										"& .MuiToggleButton-root": {
											textTransform: "none",
											fontWeight: 500,
											px: 3,
											py: 1,
											border: `1px solid ${alpha(
												theme.palette.primary.main,
												0.2
											)}`,
											color: theme.palette.primary.main,
											"&.Mui-selected": {
												bgcolor:
													theme.palette.primary.main,
												color: "white",
												"&:hover": {
													bgcolor:
														theme.palette.primary
															.main
												}
											},
											"&:hover": {
												bgcolor: alpha(
													theme.palette.primary.main,
													0.05
												)
											}
										}
									}}
								>
									<ToggleButton value="">
										{t("all")}
									</ToggleButton>
									<ToggleButton value="true">
										{t("in-department")}
									</ToggleButton>
									<ToggleButton value="false">
										{t("not-in-department")}
									</ToggleButton>
								</ToggleButtonGroup>
							</Box>
						</Stack>
					</CardContent>
				</Card>

				{/* Employee Table */}
				<Card
					elevation={0}
					sx={{
						borderRadius: 3,
						border: `1px solid ${alpha(
							theme.palette.primary.main,
							0.1
						)}`,
						overflow: "hidden"
					}}
				>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow
									sx={{
										bgcolor: theme.palette.primary.main
									}}
								>
									<TableCell
										sx={{
											color: "white",
											fontWeight: 700,
											fontSize: "1rem"
										}}
									>
										{t("information")}
									</TableCell>
									<TableCell
										sx={{
											color: "white",
											fontWeight: 700,
											fontSize: "1rem"
										}}
									>
										Email
									</TableCell>
									<TableCell
										sx={{
											color: "white",
											fontWeight: 700,
											fontSize: "1rem"
										}}
									>
										{t("phone-number")}
									</TableCell>
									<TableCell
										sx={{
											color: "white",
											fontWeight: 700,
											fontSize: "1rem"
										}}
									>
										{t("status")}
									</TableCell>
									<TableCell
										sx={{
											color: "white",
											fontWeight: 700,
											fontSize: "1rem",
											textAlign: "center"
										}}
									>
										{t("action")}
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading
									? Array.from({ length: 5 }).map(
											(_, index) => (
												<TableRow
													key={`skeleton-${index}`}
												>
													<TableCell>
														<Stack
															direction="row"
															alignItems="center"
															spacing={2}
														>
															<Skeleton
																variant="circular"
																width={48}
																height={48}
															/>
															<Skeleton
																variant="text"
																width={120}
																height={24}
															/>
														</Stack>
													</TableCell>
													<TableCell>
														<Skeleton
															variant="text"
															width={100}
															height={20}
														/>
													</TableCell>
													<TableCell>
														<Skeleton
															variant="rectangular"
															width={120}
															height={24}
															sx={{
																borderRadius: 1
															}}
														/>
													</TableCell>
													<TableCell align="center">
														<Skeleton
															variant="circular"
															width={40}
															height={40}
														/>
													</TableCell>
												</TableRow>
											)
									  )
									: employees.map((employee, index) => (
											<Fade
												in={true}
												timeout={300 + index * 50}
												key={employee.id}
											>
												<TableRow
													sx={{
														"&:hover": {
															bgcolor: alpha(
																theme.palette
																	.primary
																	.main,
																0.02
															)
														},
														"&:nth-of-type(even)": {
															bgcolor: alpha(
																theme.palette
																	.primary
																	.main,
																0.01
															)
														}
													}}
												>
													<TableCell>
														<Stack
															direction="row"
															alignItems="center"
															spacing={2}
														>
															<CustomAvatar
																src={
																	employee.avatar
																}
																sx={{
																	width: 48,
																	height: 48,
																	border: `2px solid ${alpha(
																		theme
																			.palette
																			.primary
																			.main,
																		0.1
																	)}`
																}}
															/>
															<Box>
																<Typography
																	variant="body1"
																	sx={{
																		fontWeight: 600
																	}}
																>
																	{employee.firstName +
																		" " +
																		employee.lastName}
																</Typography>
																<Typography
																	variant="caption"
																	color="text.secondary"
																>
																	@
																	{
																		employee.username
																	}
																</Typography>
															</Box>
														</Stack>
													</TableCell>
													<TableCell>
														<Typography
															variant="body2"
															sx={{
																fontWeight: 400
															}}
														>
															{employee.email}
														</Typography>
													</TableCell>
													<TableCell>
														<Typography
															variant="body2"
															sx={{
																fontWeight: 400
															}}
														>
															{employee.phone}
														</Typography>
													</TableCell>
													<TableCell>
														<Chip
															icon={
																employee.inDepartment ? (
																	<PersonAddIcon
																		sx={{
																			fontSize: 16
																		}}
																	/>
																) : (
																	<PersonRemoveIcon
																		sx={{
																			fontSize: 16
																		}}
																	/>
																)
															}
															label={
																employee.inDepartment
																	? t(
																			"in-department"
																	  )
																	: t(
																			"not-in-department"
																	  )
															}
															color={
																employee.inDepartment
																	? "primary"
																	: "default"
															}
															size="small"
															variant={
																employee.inDepartment
																	? "filled"
																	: "outlined"
															}
															sx={{
																fontWeight: 500,
																borderRadius: 2
															}}
														/>
													</TableCell>
													<TableCell align="center">
														<IconButton
															onClick={() =>
																handleToggleDepartment(
																	employee.id
																)
															}
															sx={{
																width: 44,
																height: 44,
																borderRadius: 2,
																border: `1px solid ${alpha(
																	employee.inDepartment
																		? theme
																				.palette
																				.error
																				.main
																		: theme
																				.palette
																				.primary
																				.main,
																	0.2
																)}`,
																color: employee.inDepartment
																	? theme
																			.palette
																			.error
																			.main
																	: theme
																			.palette
																			.primary
																			.main,
																"&:hover": {
																	bgcolor:
																		alpha(
																			employee.inDepartment
																				? theme
																						.palette
																						.error
																						.main
																				: theme
																						.palette
																						.primary
																						.main,
																			0.05
																		),
																	borderColor:
																		employee.inDepartment
																			? theme
																					.palette
																					.error
																					.main
																			: theme
																					.palette
																					.primary
																					.main,
																	transform:
																		"scale(1.05)"
																},
																transition:
																	"all 0.2s ease"
															}}
														>
															{employee.inDepartment ? (
																<RemoveIcon />
															) : (
																<AddIcon />
															)}
														</IconButton>
													</TableCell>
												</TableRow>
											</Fade>
									  ))}
							</TableBody>
						</Table>
					</TableContainer>

					{/* Empty State */}
					{!loading && employees.length === 0 && (
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
									width: 100,
									height: 100,
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
								<PeopleIcon
									sx={{
										fontSize: 40,
										color: theme.palette.primary.main
									}}
								/>
							</Box>
							<Typography
								variant="h6"
								sx={{
									color: theme.palette.primary.main,
									mb: 1,
									fontWeight: 600
								}}
							>
								{t("no-employees-found")}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{t("no-employees-found-long")}
							</Typography>
						</Box>
					)}
				</Card>

				{/* Pagination */}
				<Box
					sx={{
						mt: 3,
						width: "100%",
						display: "flex",
						justifyContent: "center"
					}}
				>
					<Pagination
						count={totalPage}
						page={pageNumber}
						onChange={handlePageChange}
						color="primary"
						showFirstButton
						showLastButton
					/>
				</Box>
			</Box>
		</>
	)
}
