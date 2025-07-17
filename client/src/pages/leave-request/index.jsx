import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Pagination,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField
} from "@mui/material"
import { useEffect, useState } from "react"
import {
	getLeaveRequestsApi,
	approveLeaveRequestApi,
	rejectLeaveRequestApi,
	createLeaveRequestApi,
	exportLeaveRequestWordApi,
	getMyPendingSentApi,
	getPendingToApproveApi
} from "~/services/leave.service"
import { Alert, Stack } from "@mui/material"
import TaskAltIcon from "@mui/icons-material/TaskAlt" // icon đẹp
import MoreVertIcon from "@mui/icons-material/MoreVert"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import { useDispatch } from "react-redux"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { useTranslation } from "react-i18next"
import { useForm, Controller } from "react-hook-form"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { fetchAccountDataApi } from "~/services/auth.service"
import { getAccountsByRolesApi } from "~/services/account.service"
import SignatureCanvas from "react-signature-canvas"

const STATUS_OPTIONS = [
	{ value: "", label: "Tất cả" },
	{ value: "PENDING", label: "Chờ duyệt" },
	{ value: "APPROVED", label: "Đã duyệt" },
	{ value: "REJECTED", label: "Từ chối" },
	{ value: "CANCELLED", label: "Đã hủy" }
]

const schema = yup.object().shape({
	reason: yup.string().required("Lý do không được bỏ trống"),
	startDate: yup.string().required("Ngày bắt đầu không được bỏ trống"),
	endDate: yup
		.string()
		.required("Ngày kết thúc không được bỏ trống")
		.test(
			"is-after",
			"Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
			function (value) {
				const { startDate } = this.parent
				return !startDate || !value || value >= startDate
			}
		),
	receiverId: yup.number().required("Phải chọn người duyệt")
})

export default function LeaveRequest() {
	const { t } = useTranslation("leave_page")
	const dispatch = useDispatch()

	const [showPendingToApprove, setShowPendingToApprove] = useState(false)
	const [showMyPendingSent, setShowMyPendingSent] = useState(false)
	const [pendingToApprove, setPendingToApprove] = useState([])
	const [myPendingSent, setMyPendingSent] = useState([])

	const [openReasonDialog, setOpenReasonDialog] = useState(false)
	const [fullReason, setFullReason] = useState("")

	const [anchorEl, setAnchorEl] = useState(null)
	const [menuRowId, setMenuRowId] = useState(null)

	//dialog ký tên
	const [signDialogOpen, setSignDialogOpen] = useState(false)
	const [currentApproveId, setCurrentApproveId] = useState(null)
	const [signaturePad, setSignaturePad] = useState(null)
	const [signError, setSignError] = useState("")

	const [loading, setLoading] = useState(false)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [receiverList, setReceiverList] = useState([])
	const [status, setStatus] = useState("")
	const [page, setPage] = useState(1)
	const [size] = useState(10)
	const [leaveData, setLeaveData] = useState({
		items: [],
		totalPages: 1,
		totalElements: 0,
		currentPage: 1
	})
	const [account, setAccount] = useState(null)

	const {
		handleSubmit,
		control,
		reset,
		formState: { errors }
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			reason: "",
			startDate: "",
			endDate: "",
			receiverId: null
		}
	})

	const handleMenuOpen = (event, rowId) => {
		setAnchorEl(event.currentTarget)
		setMenuRowId(rowId)
	}

	const handleMenuClose = () => {
		setAnchorEl(null)
		setMenuRowId(null)
	}

	// Các biến nhận biết vai trò
	const isEmployee = account?.role === "EMPLOYEE"
	const isManager = account?.role === "MANAGER"
	const isAdmin = account?.role === "ADMIN"
	const isPM = account?.role === "PM"

	const fetchLeaveRequests = async (params = {}) => {
		setLoading(true)
		const res = await getLeaveRequestsApi({ ...params, size })
		setLoading(false)
		if (res.status !== 200) {
			dispatch(setPopup({ type: "error", message: res.message }))
			return
		}
		setLeaveData(res.data)
	}

	// Sử dụng API để lấy receiver list
	const fetchAccountAndReceivers = async () => {
		const res = await fetchAccountDataApi()
		if (res.status === 200) {
			setAccount(res.data)
			let roles = []
			if (res.data.role === "EMPLOYEE") {
				roles = ["HOD"]
			} else if (res.data.role === "HOD" || res.data.role === "PM") {
				roles = ["MANAGER"]
			} else {
				roles = []
			}
			if (roles.length > 0) {
				const receiverRes = await getAccountsByRolesApi(roles)
				if (receiverRes.status === 200) {
					setReceiverList(receiverRes.data)
				} else {
					setReceiverList([])
					dispatch(
						setPopup({
							type: "error",
							message: receiverRes.message
						})
					)
				}
			} else {
				setReceiverList([])
			}
		}
	}

	// Hàm duyệt đơn với chữ ký
	const handleSignAndApprove = async () => {
		if (!signaturePad || signaturePad.isEmpty()) {
			setSignError("Bạn phải ký tên trước khi xác nhận!")
			return
		}
		setLoading(true)
		const signatureDataUrl = signaturePad.toDataURL() // Base64 PNG

		// Gọi API duyệt đơn, gửi kèm signatureDataUrl
		const res = await approveLeaveRequestApi(
			currentApproveId,
			signatureDataUrl
		) // <-- Chỉnh API này nhận 2 tham số
		setLoading(false)
		setSignDialogOpen(false)
		setCurrentApproveId(null)

		if (res.status !== 200) {
			dispatch(setPopup({ type: "error", message: res.message }))
		} else {
			dispatch(setPopup({ type: "success", message: res.message }))
			fetchLeaveRequests({ status, page })
		}
	}

	useEffect(() => {
		fetchLeaveRequests({ status, page })
		// eslint-disable-next-line
	}, [status, page])

	useEffect(() => {
		// Lấy danh sách đơn bạn cần duyệt
		if (account?.role === "HOD" || account?.role === "MANAGER") {
			getPendingToApproveApi().then((res) => {
				if (res.status === 200 && Array.isArray(res.data)) {
					setPendingToApprove(res.data)
				}
			})
		}
		// Lấy danh sách đơn bạn đã gửi chờ duyệt
		if (["EMPLOYEE", "HOD", "PM"].includes(account?.role)) {
			getMyPendingSentApi().then((res) => {
				if (res.status === 200 && Array.isArray(res.data)) {
					setMyPendingSent(res.data)
				}
			})
		}
	}, [account])

	useEffect(() => {
		fetchAccountAndReceivers()
	}, [])

	const handleChangeStatus = (e) => {
		setStatus(e.target.value)
		setPage(1)
	}

	const handleChangePage = (e, value) => {
		setPage(value)
	}

	const handleApprove = (id) => {
		setCurrentApproveId(id) // Lưu id của đơn cần duyệt
		setSignDialogOpen(true) // Mở dialog ký tên
		setSignError("") // Reset lỗi (nếu có)
	}

	const handleReject = async (id) => {
		setLoading(true)
		const res = await rejectLeaveRequestApi(id)
		setLoading(false)
		if (res.status !== 200) {
			dispatch(setPopup({ type: "error", message: res.message }))
		} else {
			dispatch(setPopup({ type: "success", message: res.message }))
			fetchLeaveRequests({ status, page })
		}
	}

	const handleOpenDialog = () => {
		reset()
		setDialogOpen(true)
	}

	const handleCloseDialog = () => {
		setDialogOpen(false)
	}

	const onSubmit = async (formData) => {
		setLoading(true)
		const res = await createLeaveRequestApi(formData)
		setLoading(false)
		if (res.status !== 201) {
			dispatch(setPopup({ type: "error", message: res.message }))
		} else {
			dispatch(setPopup({ type: "success", message: res.message }))
			setDialogOpen(false)
			fetchLeaveRequests({ status, page: 1 })
			setPage(1)
		}
	}

	// JS thuần format: YYYY-MM-DD -> DD/MM/YYYY
	const formatDate = (str) => {
		if (!str) return ""
		const [year, month, day] = str.split("-")
		return `${day}/${month}/${year}`
	}

	// Ví dụ: '2025-07-14T15:18:32.241Z' -> '14/07/2025 15:18'
	const formatDateTime = (isoString) => {
		if (!isoString) return ""
		const date = new Date(isoString)
		const day = String(date.getDate()).padStart(2, "0")
		const month = String(date.getMonth() + 1).padStart(2, "0")
		const year = date.getFullYear()
		const hour = String(date.getHours()).padStart(2, "0")
		const min = String(date.getMinutes()).padStart(2, "0")
		return `${day}/${month}/${year}  ${hour}:${min}`
	}

	const handleExportWord = async (id) => {
		try {
			setLoading(true)
			const blob = await exportLeaveRequestWordApi(id)

			// Tạo URL và trigger download
			const url = window.URL.createObjectURL(new Blob([blob]))
			const link = document.createElement("a")
			link.href = url
			link.setAttribute("download", `leaveRequest_${id}.docx`)
			document.body.appendChild(link)
			link.click()
			link.parentNode.removeChild(link)
			setLoading(false)
		} catch (err) {
			setLoading(false)
			dispatch(setPopup({ type: "error", message: "Tải file thất bại!" }))
		}
	}

	return (
		<>
			<title>{t("Leave Requests")}</title>
			<Box
				sx={{
					width: "100%",
					maxWidth: 2000,
					mx: "auto",
					mt: 4,
					px: 2
				}}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						mb: 2,
						flexWrap: "wrap",
						gap: 2
					}}
				>
					<Typography variant="h4" sx={{ fontWeight: 700 }}>
						{t("Leave Requests")}
					</Typography>
					<Box sx={{ display: "flex", gap: 2 }}>
						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>{t("Status")}</InputLabel>
							<Select
								value={status}
								label={t("Status")}
								onChange={handleChangeStatus}
							>
								{STATUS_OPTIONS.map((opt) => (
									<MenuItem key={opt.value} value={opt.value}>
										{t(opt.label)}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						{/* Ẩn nút tạo đơn cho MANAGER và ADMIN */}
						{!isManager && !isAdmin && (
							<Button
								variant="contained"
								onClick={handleOpenDialog}
								sx={{ whiteSpace: "nowrap" }}
							>
								{t("Create Leave Request")}
							</Button>
						)}
					</Box>
				</Box>

				{/* Đơn bạn đã gửi chờ duyệt */}
				{["EMPLOYEE", "HOD", "PM"].includes(account?.role) &&
					myPendingSent.length > 0 && (
						<Stack sx={{ mb: 2, width: "100%" }}>
							<Alert
								icon={<TaskAltIcon fontSize="inherit" />}
								severity="info"
								action={
									<Button
										color="primary"
										size="small"
										variant={
											showMyPendingSent
												? "outlined"
												: "contained"
										}
										onClick={() => {
											if (!showMyPendingSent) {
												setLeaveData({
													items: myPendingSent,
													totalPages: 1,
													totalElements:
														myPendingSent.length,
													currentPage: 1
												})
												setShowMyPendingSent(true)
												setShowPendingToApprove(false)
											} else {
												setShowMyPendingSent(false)
												fetchLeaveRequests({
													status,
													page
												})
											}
										}}
									>
										{showMyPendingSent
											? "Bỏ lọc"
											: `Xem đơn (${myPendingSent.length})`}
									</Button>
								}
								sx={{
									fontWeight: 500,
									bgcolor: "#e3f2fd",
									color: "#1976d2",
									border: "1px solid #90caf9",
									borderRadius: 2,
									alignItems: "center"
								}}
							>
								Bạn có <b>{myPendingSent.length}</b> đơn{" "}
								<span style={{ color: "#ff9800" }}>
									chờ được duyệt
								</span>
							</Alert>
						</Stack>
					)}

				{/* Đơn bạn cần duyệt */}
				{(account?.role === "HOD" || account?.role === "MANAGER") &&
					pendingToApprove.length > 0 && (
						<Stack sx={{ mb: 2, width: "100%" }}>
							<Alert
								icon={<TaskAltIcon fontSize="inherit" />}
								severity="info"
								action={
									<Button
										color="primary"
										size="small"
										variant={
											showPendingToApprove
												? "outlined"
												: "contained"
										}
										onClick={() => {
											if (!showPendingToApprove) {
												setLeaveData({
													items: pendingToApprove,
													totalPages: 1,
													totalElements:
														pendingToApprove.length,
													currentPage: 1
												})
												setShowPendingToApprove(true)
												setShowMyPendingSent(false)
											} else {
												setShowPendingToApprove(false)
												fetchLeaveRequests({
													status,
													page
												})
											}
										}}
									>
										{showPendingToApprove
											? "Bỏ lọc"
											: `Xem đơn (${pendingToApprove.length})`}
									</Button>
								}
								sx={{
									fontWeight: 500,
									bgcolor: "#e3f2fd",
									color: "#1976d2",
									border: "1px solid #90caf9",
									borderRadius: 2,
									alignItems: "center"
								}}
							>
								Bạn có <b>{pendingToApprove.length}</b> đơn{" "}
								<span style={{ color: "#ff9800" }}>
									chờ bạn duyệt
								</span>
							</Alert>
						</Stack>
					)}

				<TableContainer component={Paper} sx={{ mb: 2 }}>
					<Table>
						<TableHead>
							<TableRow sx={{ backgroundColor: "#4caf50" }}>
								<TableCell>#</TableCell>
								<TableCell>{t("CreatedAt")}</TableCell>
								<TableCell>{t("Reason")}</TableCell>
								<TableCell>{t("From")}</TableCell>
								<TableCell>{t("To")}</TableCell>
								<TableCell>{t("Sender")}</TableCell>
								<TableCell>{t("Receiver")}</TableCell>
								<TableCell>{t("Status")}</TableCell>
								<TableCell align="center">
									{t("Actions")}
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={8} align="center">
										<CircularProgress />
									</TableCell>
								</TableRow>
							) : leaveData.items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} align="center">
										{t("No leave requests found")}
									</TableCell>
								</TableRow>
							) : (
								leaveData.items.map((row, idx) => (
									<TableRow key={row.id}>
										<TableCell>
											{(leaveData.currentPage - 1) *
												size +
												idx +
												1}
										</TableCell>
										<TableCell>
											{row.createdAt
												? formatDateTime(row.createdAt)
												: ""}
										</TableCell>
										<TableCell>
											{row.reason.length > 50 ? (
												<>
													{row.reason.slice(0, 50) +
														"... "}
													<Button
														size="small"
														sx={{
															minWidth: 0,
															p: 0,
															textTransform:
																"none"
														}}
														onClick={() => {
															setFullReason(
																row.reason
															)
															setOpenReasonDialog(
																true
															)
														}}
													>
														Xem thêm
													</Button>
												</>
											) : (
												row.reason
											)}
										</TableCell>
										<TableCell>
											{formatDate(row.startDate)}
										</TableCell>
										<TableCell>
											{formatDate(row.endDate)}
										</TableCell>
										<TableCell>
											{row.sender?.fullName} <br />
											<Typography
												component="span"
												color="text.secondary"
												fontSize={12}
											>
												{row.sender?.role}
											</Typography>
										</TableCell>
										<TableCell>
											{row.receiver?.fullName} <br />
											<Typography
												component="span"
												color="text.secondary"
												fontSize={12}
											>
												{row.receiver?.role}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip
												label={t(row.status)}
												color={
													row.status === "APPROVED"
														? "success"
														: row.status ===
														  "REJECTED"
														? "error"
														: row.status ===
														  "PENDING"
														? "warning"
														: "default"
												}
												variant="outlined"
												size="small"
											/>
										</TableCell>
										<TableCell align="center">
											<IconButton
												onClick={(e) =>
													handleMenuOpen(e, row.id)
												}
											>
												<MoreVertIcon />
											</IconButton>
											<Menu
												anchorEl={anchorEl}
												open={menuRowId === row.id}
												onClose={handleMenuClose}
												anchorOrigin={{
													vertical: "bottom",
													horizontal: "right"
												}}
												transformOrigin={{
													vertical: "top",
													horizontal: "right"
												}}
											>
												<MenuItem
													onClick={() => {
														handleExportWord(row.id)
														handleMenuClose()
													}}
												>
													{t("Export Word")}
												</MenuItem>
												{!isEmployee &&
													!isAdmin &&
													!isPM &&
													row.status === "PENDING" &&
													!(
														account.role ===
															"HOD" &&
														row.sender?.role ===
															"HOD"
													) && [
														<MenuItem
															key="approve"
															onClick={() => {
																handleApprove(
																	row.id
																)
																handleMenuClose()
															}}
															sx={{
																color: "green"
															}}
														>
															{t("Approve")}
														</MenuItem>,
														<MenuItem
															key="reject"
															onClick={() => {
																handleReject(
																	row.id
																)
																handleMenuClose()
															}}
															sx={{
																color: "red"
															}}
														>
															{t("Reject")}
														</MenuItem>
													]}
											</Menu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>
				<Box
					sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}
				>
					<Pagination
						count={leaveData.totalPages || 1}
						page={leaveData.currentPage || 1}
						onChange={handleChangePage}
						color="primary"
						size="medium"
					/>
				</Box>
			</Box>
			<Dialog
				open={dialogOpen}
				onClose={handleCloseDialog}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>{t("Create Leave Request")}</DialogTitle>
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogContent sx={{ pb: 1 }}>
						<Controller
							name="reason"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label={t("Reason")}
									margin="normal"
									fullWidth
									multiline
									minRows={3}
									maxRows={8} // Tùy chọn, hoặc bỏ để không giới hạn
									inputProps={{ maxLength: 800 }} // hoặc không giới hạn nếu muốn
									error={!!errors.reason}
									helperText={errors.reason?.message}
									disabled={loading}
								/>
							)}
						/>

						<Controller
							name="startDate"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label={t("Start Date")}
									type="date"
									margin="normal"
									fullWidth
									InputLabelProps={{ shrink: true }}
									error={!!errors.startDate}
									helperText={errors.startDate?.message}
									disabled={loading}
								/>
							)}
						/>
						<Controller
							name="endDate"
							control={control}
							render={({ field }) => (
								<TextField
									{...field}
									label={t("End Date")}
									type="date"
									margin="normal"
									fullWidth
									InputLabelProps={{ shrink: true }}
									error={!!errors.endDate}
									helperText={errors.endDate?.message}
									disabled={loading}
								/>
							)}
						/>
						<Controller
							name="receiverId"
							control={control}
							render={({ field }) => (
								<FormControl
									fullWidth
									margin="normal"
									error={!!errors.receiverId}
								>
									<InputLabel>{t("Receiver")}</InputLabel>
									<Select
										{...field}
										label={t("Receiver")}
										disabled={
											loading || receiverList.length === 0
										}
										value={field.value ?? ""} // dùng nullish (null => "")
										onChange={(e) => {
											// Nếu chọn option, convert sang number, nếu bỏ chọn thì null
											const val =
												e.target.value === ""
													? null
													: Number(e.target.value)
											field.onChange(val)
										}}
									>
										{receiverList.map((user) => (
											<MenuItem
												key={user.id}
												value={user.id}
											>
												{user.fullName} ({user.role})
											</MenuItem>
										))}
									</Select>
									{errors.receiverId && (
										<Typography
											color="error"
											variant="caption"
										>
											{errors.receiverId.message}
										</Typography>
									)}
								</FormControl>
							)}
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCloseDialog} color="secondary">
							{t("Cancel")}
						</Button>
						<Button
							type="submit"
							variant="contained"
							disabled={loading}
						>
							{loading ? (
								<CircularProgress size={20} />
							) : (
								t("Submit")
							)}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			<Dialog
				open={signDialogOpen}
				onClose={() => setSignDialogOpen(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Ký tên xác nhận</DialogTitle>
				<DialogContent>
					<SignatureCanvas
						penColor="black"
						canvasProps={{
							width: 350,
							height: 120,
							className: "sigCanvas"
						}}
						ref={setSignaturePad}
						backgroundColor="#fff"
					/>
					<Box
						sx={{
							mt: 1,
							display: "flex",
							justifyContent: "space-between"
						}}
					>
						<Button
							onClick={() => signaturePad && signaturePad.clear()}
						>
							Xóa
						</Button>
						<Typography color="error" variant="caption">
							{signError}
						</Typography>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setSignDialogOpen(false)}
						color="secondary"
					>
						Hủy
					</Button>
					<Button
						onClick={handleSignAndApprove}
						variant="contained"
						disabled={loading}
					>
						{loading ? <CircularProgress size={20} /> : "Xác nhận"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog hiện đủ lý do */}
			<Dialog
				open={openReasonDialog}
				onClose={() => setOpenReasonDialog(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Lý do xin nghỉ phép</DialogTitle>
				<DialogContent>
					<Typography>{fullReason}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenReasonDialog(false)}>
						Đóng
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}
