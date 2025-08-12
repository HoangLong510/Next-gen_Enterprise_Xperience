import React, { useRef, useState } from "react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import {
	Box,
	Button,
	Card,
	CardContent,
	Typography,
	Alert,
	AlertTitle,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	TextField,
	Select,
	MenuItem,
	FormControl,
	Chip,
	LinearProgress,
	Stack,
	Grid
} from "@mui/material"
import {
	CloudUpload,
	Download,
	Preview,
	CheckCircle,
	Error,
	Refresh,
	FileUpload,
	TableChart,
	ArrowBack // ⬅️ icon cho nút quay lại
} from "@mui/icons-material"
import { styled } from "@mui/material/styles"
import {
	downloadEmployeesImportTemplateApi,
	previewEmployeesImportApi,
	importEmployeesApi
} from "~/services/employee.service.js"
import { useDispatch } from "react-redux"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { ROLE_CONFIGS } from "~/constants/account.constants"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom" // ⬅️ dùng để điều hướng về /employees

// ==== CẤU HÌNH CỘT BẮT BUỘC TRONG FILE EXCEL ====
const KEYS = [
	"firstName",
	"lastName",
	"email",
	"phone",
	"address",
	"gender",
	"dateBirth",
	"role"
]

// ==== GIÁ TRỊ HỢP LỆ CHO MỘT SỐ TRƯỜNG CHỌN ====
const GENDERS = ["MALE", "FEMALE", "OTHER"]
const ROLES = ROLE_CONFIGS.map((role) => role.value)

// ==== INPUT ẨN DÙNG CHO BUTTON CHỌN FILE ====
const VisuallyHiddenInput = styled("input")({
	clip: "rect(0 0 0 0)",
	clipPath: "inset(50%)",
	height: 1,
	overflow: "hidden",
	position: "absolute",
	bottom: 0,
	left: 0,
	whiteSpace: "nowrap",
	width: 1
})

// ==== CARD TÙY BIẾN NHẸ NHÀNG ====
const StyledCard = styled(Card)(({ theme }) => ({
	borderRadius: theme.spacing(2),
	boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.15)",
	border: "none"
}))

// ==== Ô BẢNG HIỂN THỊ LỖI (TÔ NỀN NHẸ, CÓ VIỀN TRÁI ĐỎ) ====
const ErrorTableCell = styled(TableCell)(({ theme, hasError }) => ({
	backgroundColor: hasError
		? theme.palette.error.light + "20"
		: "transparent",
	borderLeft: hasError ? `3px solid ${theme.palette.error.main}` : "none",
	verticalAlign: "top",
	minHeight: "72px",
	maxWidth: "200px",
	"& .MuiFormControl-root, & .MuiTextField-root": {
		minHeight: "40px"
	}
}))

export default function EmployeeExcelImport() {
	const dispatch = useDispatch()
	const { t: tError } = useTranslation("errors")
	const { t } = useTranslation("employees_list_page")
	const navigate = useNavigate() // ⬅️ hook điều hướng

	// ==== STATE QUẢN LÝ FILE/WORKBOOK KẾT QUẢ/TIẾN TRÌNH ====
	const [file, setFile] = useState(null)
	const [result, setResult] = useState(null) // dữ liệu trả về từ API preview/import
	const [loading, setLoading] = useState("idle") // idle | template | preview | apply | import
	const [editingRows, setEditingRows] = useState([]) // danh sách chỉ số dòng đang chỉnh sửa

	// ==== REF LƯU WORKBOOK & MAP VỊ TRÍ CỘT/DÒNG TRONG EXCEL ====
	const wbRef = useRef(null)
	const mapRef = useRef(null)
	const fileInputRef = useRef(null)

	// ==== CỜ & TÍNH TOÁN NHANH ĐỂ ẨN/HIỆN NÚT ====
	const hasErrors = !!result && !result.success
	const errorRowCount =
		result?.rows?.filter(
			(r) => r.errors && Object.keys(r.errors).length > 0
		).length || 0
	const showPreviewBtn = !result && !!file && loading === "idle"
	const canImport =
		!!result &&
		result.success &&
		(result.inserted ?? 0) > 0 &&
		loading === "idle"

	// ==== HÀM RESET TOÀN BỘ TRẠNG THÁI ====
	const resetAll = () => {
		setFile(null)
		setResult(null)
		setEditingRows([])
		wbRef.current = null
		mapRef.current = null
		if (fileInputRef.current) fileInputRef.current.value = ""
	}

	// ==== XỬ LÝ CHỌN FILE: VALIDATE LOẠI FILE, ĐỌC SHEET, XÁC ĐỊNH HÀNG KEY ====
	const chooseFile = async (e) => {
		const f = e.target.files?.[0] || null

		setResult(null)
		setEditingRows([])
		wbRef.current = null
		mapRef.current = null
		setFile(null)

		if (!f) return

		// Kiểm tra loại file + phần mở rộng
		const validTypes = [
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-excel"
		]
		const fileExt = f.name.split(".").pop().toLowerCase()
		if (
			!validTypes.includes(f.type) ||
			!["xlsx", "xls"].includes(fileExt)
		) {
			dispatch(
				setPopup({
					type: "error",
					message: "please-select-a-file-excel"
				})
			)
			if (fileInputRef.current) fileInputRef.current.value = ""
			return
		}

		setFile(f)

		// Đọc workbook
		const buf = await f.arrayBuffer()
		const wb = XLSX.read(buf, { type: "array" })

		// Lấy sheet đầu tiên (giả định template chuẩn)
		const sheetName = wb.SheetNames[0]
		const ws = wb.Sheets[sheetName]
		if (!ws) {
			dispatch(
				setPopup({
					type: "error",
					message: "sheet-employees-does-not-exist"
				})
			)
			return
		}

		// Hàm đọc 1 hàng thành mảng 100 cột (đủ an toàn với template)
		const readRow = (r) => {
			const arr = []
			for (let c = 0; c < 100; c++) {
				const cell = ws[XLSX.utils.encode_cell({ r, c })]
				arr.push(String(cell?.v ?? "").trim())
			}
			return arr
		}

		// Tìm hàng chứa header keys (ưu tiên dòng 2, fallback dòng 1)
		const keysRowIdxCandidate = 1
		let keysRow = readRow(keysRowIdxCandidate)
		let ok = KEYS.every((k) => keysRow.includes(k))
		let keyRowIndex = ok ? keysRowIdxCandidate : 0
		if (!ok) {
			keysRow = readRow(0)
			ok = KEYS.every((k) => keysRow.includes(k))
			keyRowIndex = 0
		}
		if (!ok) {
			dispatch(setPopup({ type: "error", message: "invalid-template" }))
			return
		}

		// Map vị trí cột theo key
		const colIndexByKey = {}
		KEYS.forEach((k) => {
			colIndexByKey[k] = keysRow.findIndex((x) => x === k)
		})

		// Lưu thông tin map vào ref
		const dataStartRow = keyRowIndex + 1
		wbRef.current = wb
		mapRef.current = {
			sheetName,
			keysRow: keyRowIndex,
			dataStartRow,
			colIndexByKey
		}
	}

	// ==== TẢI TEMPLATE TỪ API ====
	const onDownloadTemplate = async () => {
		try {
			setLoading("template")
			const res = await downloadEmployeesImportTemplateApi()
			const filename = "employee_import_template.xlsx"
			saveAs(new Blob([res.data]), filename)
		} catch (e) {
			dispatch(
				setPopup({ type: "error", message: "template-download-failed" })
			)
		} finally {
			setLoading("idle")
		}
	}

	// ==== GỬI FILE LÊN API ĐỂ XEM TRƯỚC KẾT QUẢ VALIDATE ====
	const onPreview = async () => {
		if (!file) return
		setLoading("preview")
		const data = await previewEmployeesImportApi(file)
		setResult(data)

		// Lọc ra các dòng có lỗi để cho phép chỉnh sửa ngay
		const rowsWithErr = (data?.rows || []).filter(
			(r) => r.errors && Object.keys(r.errors).length > 0
		)
		setEditingRows(rowsWithErr.map((r) => r.rowIndex))
		setLoading("idle")
	}

	// ==== GHI GIÁ TRỊ ĐÃ SỬA NGAY VÀO WORKBOOK TRONG BỘ NHỚ ====
	const applyEditToWorkbook = (rowIndexExcel1Based, field, value) => {
		const wb = wbRef.current
		const map = mapRef.current
		if (!wb || !map) return
		const ws = wb.Sheets[map.sheetName]

		const r0 = rowIndexExcel1Based - 1
		const c = map.colIndexByKey[field]
		if (c == null || c < 0) return

		const addr = XLSX.utils.encode_cell({ r: r0, c })
		ws[addr] = { t: "s", v: value ?? "" }

		// Đảm bảo vùng !ref tồn tại (để XLSX.write không lỗi)
		if (!ws["!ref"]) {
			ws["!ref"] = XLSX.utils.encode_range({
				s: { r: 0, c: 0 },
				e: { r: r0, c }
			})
		}
	}

	// ==== XỬ LÝ THAY ĐỔI TRÊN UI + GHI LẠI WORKBOOK ====
	const handleFieldChange = (row, field, value) => {
		// Cập nhật state result để UI phản ánh ngay
		setResult((prev) => {
			if (!prev) return prev
			const next = JSON.parse(JSON.stringify(prev))
			const target = next.rows.find((x) => x.rowIndex === row.rowIndex)
			if (target) {
				if (!target.data) target.data = {}
				target.data[field] = value

				// Xóa lỗi của field nếu đã sửa
				if (target.errors && target.errors[field]) {
					delete target.errors[field]
					if (Object.keys(target.errors).length === 0) {
						delete target.errors
					}
				}
			}
			return next
		})

		// Ghi vào workbook
		applyEditToWorkbook(row.rowIndex, field, value)
	}

	// ==== CHUYỂN WORKBOOK TRONG BỘ NHỚ THÀNH BLOB ====
	const writeWorkbookBlob = () => {
		if (!wbRef.current) return null
		const out = XLSX.write(wbRef.current, {
			type: "array",
			bookType: "xlsx"
		})
		return new Blob([out], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		})
	}

	// ==== ÁP DỤNG SỬA & GỬI LẠI LÊN API ĐỂ KIỂM TRA LẦN NỮA ====
	const onApplyAndRecheck = async () => {
		const blob = writeWorkbookBlob()
		if (!blob) return

		setLoading("apply")
		try {
			const data = await previewEmployeesImportApi(blob)
			setResult(data)
			const rowsWithErr = (data?.rows || []).filter(
				(r) => r.errors && Object.keys(r.errors).length > 0
			)
			setEditingRows(rowsWithErr.map((r) => r.rowIndex))
		} finally {
			setLoading("idle")
		}
	}

	// ==== GỌI API IMPORT CHÍNH THỨC ====
	const onImport = async () => {
		const blob = writeWorkbookBlob()
		if (!blob) return

		setLoading("import")
		try {
			const res = await importEmployeesApi(blob)
			if (res.success) {
				dispatch(
					setPopup({
						type: "success",
						message: "import-employees-successfully"
					})
				)
			} else {
				dispatch(
					setPopup({
						type: "error",
						message: "import-employees-failed"
					})
				)
			}
			resetAll()
		} finally {
			setLoading("idle")
		}
	}

	// ==== RENDER Ô THEO TỪNG KIỂU TRƯỜNG (text/select/date) + HIỂN THỊ LỖI ====
	const renderCell = (row, key) => {
		const value = row.data?.[key] ?? ""
		const err = row.errors?.[key]

		if (key === "gender") {
			return (
				<ErrorTableCell hasError={!!err}>
					<FormControl fullWidth size="small" error={!!err}>
						<Select
							value={String(value || "")}
							onChange={(e) =>
								handleFieldChange(row, key, e.target.value)
							}
							displayEmpty
							MenuProps={{
								PaperProps: { style: { maxHeight: 200 } }
							}}
						>
							<MenuItem value="">
								<em>-- {t("select")} --</em>
							</MenuItem>
							{GENDERS.map((g) => (
								<MenuItem key={g} value={g}>
									{g}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{err && (
						<Typography
							variant="caption"
							color="error"
							display="block"
							sx={{
								mt: 0.5,
								minHeight: "16px",
								lineHeight: 1.2,
								wordBreak: "break-word"
							}}
						>
							{tError(err)}
						</Typography>
					)}
				</ErrorTableCell>
			)
		}

		if (key === "role") {
			return (
				<ErrorTableCell hasError={!!err}>
					<FormControl fullWidth size="small" error={!!err}>
						<Select
							value={String(value || "")}
							onChange={(e) =>
								handleFieldChange(row, key, e.target.value)
							}
							displayEmpty
							MenuProps={{
								PaperProps: { style: { maxHeight: 200 } }
							}}
						>
							<MenuItem value="">
								<em>-- {t("select")} --</em>
							</MenuItem>
							{ROLES.map((r) => (
								<MenuItem key={r} value={r}>
									{r}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{err && (
						<Typography
							variant="caption"
							color="error"
							display="block"
							sx={{
								mt: 0.5,
								minHeight: "16px",
								lineHeight: 1.2,
								wordBreak: "break-word"
							}}
						>
							{tError(err)}
						</Typography>
					)}
				</ErrorTableCell>
			)
		}

		if (key === "dateBirth") {
			return (
				<ErrorTableCell hasError={!!err}>
					<TextField
						type="date"
						value={String(value || "")}
						onChange={(e) =>
							handleFieldChange(row, key, e.target.value)
						}
						size="small"
						fullWidth
						error={!!err}
						InputLabelProps={{ shrink: true }}
					/>
					{err && (
						<Typography
							variant="caption"
							color="error"
							display="block"
							sx={{
								mt: 0.5,
								minHeight: "16px",
								lineHeight: 1.2,
								wordBreak: "break-word"
							}}
						>
							{tError(err)}
						</Typography>
					)}
				</ErrorTableCell>
			)
		}

		return (
			<ErrorTableCell hasError={!!err}>
				<TextField
					value={String(value || "")}
					onChange={(e) =>
						handleFieldChange(row, key, e.target.value)
					}
					size="small"
					fullWidth
					error={!!err}
					multiline
					minRows={1}
					maxRows={4}
					sx={{
						"& .MuiInputBase-root": { alignItems: "flex-start" },
						"& .MuiInputBase-input": {
							overflow: "hidden",
							textOverflow: "ellipsis"
						}
					}}
				/>
				{err && (
					<Typography
						variant="caption"
						color="error"
						display="block"
						sx={{
							mt: 0.5,
							minHeight: "16px",
							lineHeight: 1.2,
							wordBreak: "break-word"
						}}
					>
						{tError(err)}
					</Typography>
				)}
			</ErrorTableCell>
		)
	}

	return (
		<Box>
			{/* ==== Thanh tiêu đề + nút quay về danh sách (/employees) ==== */}
			<Stack
				direction="row"
				alignItems="center"
				justifyContent="space-between"
				sx={{ mb: 3 }}
			>
				<Typography
					variant="h5"
					component="h1"
					gutterBottom
					sx={{
						fontWeight: 600,
						color: "primary.main",
						display: "flex",
						alignItems: "center",
						gap: 2,
						mb: 0 // đã có margin ở Stack
					}}
				>
					<TableChart fontSize="large" />
					{t("import-employees-from-excel")}
				</Typography>

				{/* Nút quay về trang list. Sử dụng t("back") như yêu cầu */}
				<Button
					variant="text"
					startIcon={<ArrowBack />}
					onClick={() => navigate("/employees")}
				>
					{t("back")}
				</Button>
			</Stack>

			{/* ==== Thanh tiến trình khi đang xử lý ==== */}
			{loading !== "idle" && (
				<Box sx={{ mb: 3 }}>
					<LinearProgress color="primary" />
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mt: 1 }}
					>
						{loading === "template" && t("loadingTemplate")}
						{loading === "preview" && t("checkingData")}
						{loading === "apply" && t("applyingChanges")}
						{loading === "import" && t("importingData")}
					</Typography>
				</Box>
			)}

			{/* ==== Nhóm thẻ hành động: tải template / upload file / xem trước ==== */}
			<Grid container spacing={3} sx={{ mb: 4 }}>
				{/* Tải template */}
				<Grid size={{ xs: 12, md: 4 }}>
					<StyledCard>
						<CardContent sx={{ textAlign: "center", py: 3 }}>
							<Download
								sx={{
									fontSize: 48,
									color: "primary.main",
									mb: 2
								}}
							/>
							<Typography variant="h6" gutterBottom>
								{t("downloadTemplate")}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mb: 2 }}
							>
								{t("downloadTemplateDescription")}
							</Typography>
							<Button
								variant="contained"
								onClick={onDownloadTemplate}
								disabled={loading !== "idle"}
								startIcon={<Download />}
								fullWidth
							>
								{t("downloadTemplate")}
							</Button>
						</CardContent>
					</StyledCard>
				</Grid>

				{/* Upload file */}
				<Grid size={{ xs: 12, md: 4 }}>
					<StyledCard>
						<CardContent sx={{ textAlign: "center", py: 3 }}>
							<CloudUpload
								sx={{
									fontSize: 48,
									color: "primary.main",
									mb: 2
								}}
							/>
							<Typography variant="h6" gutterBottom>
								{t("uploadFile")}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ mb: 2 }}
							>
								{t("uploadFileDescription")}
							</Typography>
							<Button
								component="label"
								variant="outlined"
								startIcon={<CloudUpload />}
								fullWidth
								onClick={(e) => {
									if (fileInputRef.current) {
										fileInputRef.current.value = ""
									}
								}}
							>
								{t("chooseFile")}
								<VisuallyHiddenInput
									ref={fileInputRef}
									type="file"
									accept=".xlsx,.xls"
									onChange={chooseFile}
								/>
							</Button>

							{/* Hiển thị chip tên file đã chọn + nút xóa */}
							{file && (
								<Chip
									label={file.name}
									color="primary"
									variant="outlined"
									sx={{ mt: 1 }}
									onDelete={resetAll}
								/>
							)}
						</CardContent>
					</StyledCard>
				</Grid>

				{/* Xem trước dữ liệu (chỉ hiện khi đã có file, chưa có result) */}
				{showPreviewBtn && (
					<Grid size={{ xs: 12, md: 4 }}>
						<StyledCard>
							<CardContent sx={{ textAlign: "center", py: 3 }}>
								<Preview
									sx={{
										fontSize: 48,
										color: "primary.main",
										mb: 2
									}}
								/>
								<Typography variant="h6" gutterBottom>
									{t("previewData")}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 2 }}
								>
									{t("previewDataDescription")}
								</Typography>
								<Button
									variant="contained"
									onClick={onPreview}
									disabled={!showPreviewBtn}
									startIcon={<Preview />}
									fullWidth
								>
									{t("preview")}
								</Button>
							</CardContent>
						</StyledCard>
					</Grid>
				)}
			</Grid>

			{/* ==== Kết quả trả về sau khi preview/apply ==== */}
			{result && (
				<Box>
					{/* Trạng thái OK, có thể import */}
					{result.success && (
						<StyledCard sx={{ mb: 3 }}>
							<CardContent>
								<Alert severity="success" sx={{ mb: 3 }}>
									<AlertTitle>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 1
											}}
										>
											<CheckCircle />
											{t("validData")}
										</Box>
									</AlertTitle>
									{t("validDataDescription")}
								</Alert>

								<Stack
									direction="row"
									spacing={4}
									sx={{ mb: 2 }}
								>
									<Box>
										<Typography
											variant="h6"
											color="primary.main"
										>
											{result.totalRows}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary"
										>
											{t("totalRows")}
										</Typography>
									</Box>
									<Box>
										<Typography
											variant="h6"
											color={
												(result.inserted ?? 0) > 0
													? "success.main"
													: "text.secondary"
											}
										>
											{result.inserted}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary"
										>
											{t("eligibleToAdd")}
										</Typography>
									</Box>
								</Stack>

								{(result.inserted ?? 0) === 0 && (
									<Alert severity="info" sx={{ mb: 2 }}>
										{t("noEmployeesToAdd")}
									</Alert>
								)}

								<Button
									variant="contained"
									size="large"
									onClick={onImport}
									disabled={!canImport}
									startIcon={<FileUpload />}
									sx={{ px: 4, py: 1.5 }}
								>
									{t("importData")}
								</Button>
							</CardContent>
						</StyledCard>
					)}

					{/* Trạng thái có lỗi: hiển thị bảng cho phép sửa nhanh */}
					{hasErrors && (
						<>
							<StyledCard>
								<CardContent>
									<Alert severity="error" sx={{ mb: 3 }}>
										<AlertTitle>
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													gap: 1
												}}
											>
												<Error />
												{t("dataErrorsDetected")}
											</Box>
										</AlertTitle>
										{t("fixErrorsBeforeImport")}
									</Alert>

									<Box
										sx={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											mb: 3
										}}
									>
										<Stack direction="row" spacing={4}>
											<Box>
												<Typography
													variant="h6"
													color="text.primary"
												>
													{result.totalRows}
												</Typography>
												<Typography
													variant="body2"
													color="text.secondary"
												>
													{t("totalRows")}
												</Typography>
											</Box>
											<Box>
												<Typography
													variant="h6"
													color="error.main"
												>
													{errorRowCount}
												</Typography>
												<Typography
													variant="body2"
													color="text.secondary"
												>
													{t("errorRows")}
												</Typography>
											</Box>
										</Stack>

										{/* Áp dụng các sửa đổi đang có trong workbook & kiểm tra lại */}
										<Button
											variant="contained"
											onClick={onApplyAndRecheck}
											disabled={loading !== "idle"}
											startIcon={<Refresh />}
										>
											{t("applyAndRecheck")}
										</Button>
									</Box>

									{/* Bảng chỉ hiển thị những dòng đang có lỗi để người dùng chỉnh */}
									<TableContainer
										component={Paper}
										sx={{ maxHeight: 600 }}
									>
										<Table stickyHeader>
											<TableHead>
												<TableRow>
													<TableCell
														sx={{
															fontWeight: 600,
															bgcolor:
																"primary.main",
															color: "white"
														}}
													>
														#
													</TableCell>
													{KEYS.map((k) => (
														<TableCell
															key={k}
															sx={{
																fontWeight: 600,
																bgcolor:
																	"primary.main",
																color: "white"
															}}
														>
															{t(k)}
														</TableCell>
													))}
												</TableRow>
											</TableHead>
											<TableBody>
												{(result.rows || [])
													.filter((r) =>
														editingRows.includes(
															r.rowIndex
														)
													)
													.map((r) => (
														<TableRow
															key={r.rowIndex}
															hover
														>
															<TableCell
																sx={{
																	fontWeight: 600,
																	bgcolor:
																		"grey.50"
																}}
															>
																{r.rowIndex}
															</TableCell>
															{KEYS.map((k) => (
																<React.Fragment
																	key={k}
																>
																	{renderCell(
																		r,
																		k
																	)}
																</React.Fragment>
															))}
														</TableRow>
													))}
											</TableBody>
										</Table>
									</TableContainer>
								</CardContent>
							</StyledCard>
						</>
					)}
				</Box>
			)}
		</Box>
	)
}
