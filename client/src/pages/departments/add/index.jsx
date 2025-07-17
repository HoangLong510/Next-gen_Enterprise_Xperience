import { useEffect, useState } from "react"
import { useForm, Controller, set } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"
import {
	Typography,
	TextField,
	Button,
	MenuItem,
	InputLabel,
	FormControl,
	Select,
	Box,
	Avatar,
	useTheme,
	Grid,
	Paper,
	Divider,
	Stack,
	Chip,
	FormHelperText
} from "@mui/material"
import {
	Business as BusinessIcon,
	Person as PersonIcon,
	CloudUpload as CloudUploadIcon,
	Save as SaveIcon,
	ArrowBack as ArrowBackIcon,
	Delete as DeleteIcon
} from "@mui/icons-material"
import { Link, useNavigate } from "react-router-dom"
import CustomAvatar from "~/components/custom-avatar"
import { createDepartmentApi } from "~/services/department.service"
import { useDispatch } from "react-redux"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { getListHodApi } from "~/services/employee.service"
import { useTranslation } from "react-i18next"

const schema = yup.object({
	name: yup.string().required("department-name-is-required"),
	description: yup.string().required("department-description-is-required"),
	hodId: yup.string().required("hod-is-required"),
	file: yup
		.mixed()
		.required("file-is-empty")
		.test("fileSize", "file-too-large", (value) => {
			return value && value.size <= 5 * 1024 * 1024
		})
		.test("fileType", "invalid-image-type", (value) => {
			return (
				value &&
				["image/jpeg", "image/jpg", "image/png", "image/gif"].includes(
					value.type
				)
			)
		})
})

export default function AddDepartmentPage() {
	const theme = useTheme()
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const { t } = useTranslation("department_page")
	const { t: tError } = useTranslation("errors")

	const [loading, setLoading] = useState(false)
	const [preview, setPreview] = useState("")
	const [hodList, setHodList] = useState([])

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		setError,
		formState: { errors }
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			name: "",
			description: "",
			hodId: "",
			file: null
		}
	})

	const watchedFile = watch("file")

	const handleFileChange = (e) => {
		const file = e.target.files[0]
		if (!file) return

		setValue("file", file, {
			shouldValidate: true,
			shouldTouch: true
		})
		setPreview(URL.createObjectURL(file))

		e.target.value = ""
	}

	const handleRemoveImage = () => {
		setValue("file", null, {
			shouldValidate: true,
			shouldTouch: true
		})
		setPreview("")
	}

	const onSubmit = async (data) => {
		setLoading(true)

		let formData = new FormData()
		for (let key in data) {
			formData.append(key, data[key])
		}

		const res = await createDepartmentApi(formData)
		setLoading(false)

		if (res.status === 201) {
			dispatch(
				setPopup({
					type: "success",
					message: res.message
				})
			)
			navigate("/departments")
		} else {
			if (res.errors) {
				Object.entries(res.errors).forEach(([field, message]) => {
					setError(field, {
						type: "manual",
						message: message
					})
				})
			}
			dispatch(
				setPopup({
					type: "error",
					message: res.message
				})
			)
		}
	}

	const handleGetListHod = async () => {
		setLoading(true)
		const res = await getListHodApi()
		setLoading(false)
		if (res.status === 200) {
			setHodList(res.data)
		}
	}

	useEffect(() => {
		handleGetListHod()
	}, [])

	return (
		<>
			<title>{t("create-new-department")}</title>
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
						p: 4,
						position: "relative",
						overflow: "hidden"
					}}
				>
					<Avatar
						sx={{
							bgcolor: "rgba(255,255,255,0.2)",
							width: 40,
							height: 40,
							mb: 1
						}}
					>
						<BusinessIcon sx={{ fontSize: 32 }} />
					</Avatar>
					<Box>
						<Typography variant="h6" fontWeight="bold" gutterBottom>
							{t("create-new-department")}
						</Typography>
						<Typography variant="body2" sx={{ opacity: 0.9 }}>
							{t("add-a-new-department-to-your-organization")}
						</Typography>
					</Box>
				</Box>

				{/* Form Section */}
				<Box sx={{ p: 4, background: theme.palette.grey[50] }}>
					<Box
						component="form"
						onSubmit={handleSubmit(onSubmit)}
						noValidate
					>
						<Grid container spacing={4}>
							{/* Department Name */}
							<Grid size={12}>
								<Stack spacing={1}>
									<Stack
										direction="row"
										alignItems="center"
										spacing={1}
									>
										<BusinessIcon color="primary" />
										<Typography
											variant="h6"
											color="primary"
										>
											{t("department-information")}
										</Typography>
									</Stack>
									<Divider />
								</Stack>
							</Grid>

							<Grid size={12}>
								<Controller
									name="name"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("department-name")}
											variant="outlined"
											fullWidth
											error={!!errors.name}
											helperText={tError(
												errors.name?.message
											)}
											slotProps={{
												inputLabel: { shrink: true }
											}}
											disabled={loading}
											sx={{
												"& .MuiOutlinedInput-root": {
													borderRadius: 2,
													backgroundColor:
														theme.palette.background
															.default
												}
											}}
										/>
									)}
								/>
							</Grid>

							<Grid size={12}>
								<Controller
									name="description"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("description")}
											fullWidth
											multiline
											rows={4}
											error={!!errors.description}
											helperText={tError(
												errors.description?.message
											)}
											disabled={loading}
											variant="outlined"
											slotProps={{
												inputLabel: { shrink: true }
											}}
											sx={{
												"& .MuiOutlinedInput-root": {
													borderRadius: 2,
													backgroundColor:
														theme.palette.background
															.default
												}
											}}
										/>
									)}
								/>
							</Grid>

							{/* Head of Department */}
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
											{t("leader")}
										</Typography>
									</Stack>
									<Divider />
								</Stack>
							</Grid>

							<Grid size={12}>
								<Controller
									name="hodId"
									control={control}
									render={({ field }) => (
										<FormControl
											fullWidth
											size="small"
											error={!!errors.hodId}
											sx={{
												"& .MuiOutlinedInput-root": {
													borderRadius: 2,
													backgroundColor:
														theme.palette.background
															.default
												}
											}}
										>
											<InputLabel shrink>
												{t("hod")}
											</InputLabel>
											<Select
												{...field}
												label={t("hod")}
												displayEmpty
												disabled={loading}
											>
												{hodList.map((hod) => (
													<MenuItem
														key={hod.id}
														value={hod.id}
													>
														<Stack
															direction="row"
															alignItems="center"
															spacing={1}
														>
															<CustomAvatar
																src={hod.avatar}
																sx={{
																	width: 24,
																	height: 24
																}}
															/>
															<Typography>
																{hod.firstName +
																	" " +
																	hod.lastName}
															</Typography>
														</Stack>
													</MenuItem>
												))}
											</Select>
											{errors.hodId && (
												<FormHelperText>
													{tError(
														errors.hodId.message
													)}
												</FormHelperText>
											)}
										</FormControl>
									)}
								/>
							</Grid>

							{/* Image Upload */}
							<Grid size={12}>
								<Stack spacing={1}>
									<Stack
										direction="row"
										alignItems="center"
										spacing={1}
									>
										<CloudUploadIcon color="primary" />
										<Typography
											variant="h6"
											color="primary"
										>
											{t("department-image")}
										</Typography>
									</Stack>
									<Divider />
								</Stack>
							</Grid>

							<Grid size={{ xs: 12, md: 6 }}>
								<Button
									variant="outlined"
									component="label"
									fullWidth
									startIcon={<CloudUploadIcon />}
									sx={{
										py: 2,
										borderRadius: 2,
										borderStyle: "dashed",
										borderWidth: 2,
										borderColor: errors.file
											? theme.palette.error.main
											: theme.palette.primary.main,
										color: errors.file
											? theme.palette.error.main
											: theme.palette.primary.main,
										"&:hover": {
											borderColor: errors.file
												? theme.palette.error.dark
												: theme.palette.primary.dark,
											backgroundColor: errors.file
												? `${theme.palette.error.main}08`
												: `${theme.palette.primary.main}08`
										}
									}}
								>
									{watchedFile
										? t("change-image")
										: t("upload-image")}
									<input
										type="file"
										hidden
										accept="image/jpeg,image/jpg,image/png,image/gif"
										onChange={handleFileChange}
									/>
								</Button>
								{errors.file && (
									<FormHelperText error sx={{ mt: 1, mx: 2 }}>
										{tError(errors.file.message)}
									</FormHelperText>
								)}
							</Grid>

							<Grid size={{ xs: 12, md: 6 }}>
								<Box
									sx={{
										display: "flex",
										justifyContent: "center",
										alignItems: "center",
										height: "100%",
										minHeight: 120
									}}
								>
									{preview ? (
										<Stack alignItems="center" spacing={2}>
											<Box
												sx={{
													position: "relative"
												}}
											>
												<Avatar
													src={preview}
													alt="Preview"
													sx={{
														width: 100,
														height: 100,
														border: `3px solid ${theme.palette.primary.main}`,
														boxShadow: `0 4px 20px ${theme.palette.primary.main}40`
													}}
													variant="rounded"
												/>
												<Button
													size="small"
													variant="contained"
													color="error"
													sx={{
														position: "absolute",
														top: -8,
														right: -8,
														minWidth: 32,
														width: 32,
														height: 32,
														borderRadius: "50%",
														p: 0
													}}
													onClick={handleRemoveImage}
												>
													<DeleteIcon
														sx={{
															fontSize: 16
														}}
													/>
												</Button>
											</Box>
											<Chip
												label="Image Preview"
												color="primary"
												size="small"
												variant="outlined"
											/>
										</Stack>
									) : (
										<Stack alignItems="center" spacing={1}>
											<Avatar
												sx={{
													width: 100,
													height: 100,
													bgcolor: `${theme.palette.primary.main}15`,
													border: `2px dashed ${theme.palette.primary.main}40`
												}}
												variant="rounded"
											>
												<CloudUploadIcon
													sx={{
														fontSize: 40,
														color: `${theme.palette.primary.main}60`
													}}
												/>
											</Avatar>
											<Typography
												variant="caption"
												color="text.secondary"
												textAlign="center"
											>
												{t("no-image-selected")}
											</Typography>
										</Stack>
									)}
								</Box>
							</Grid>

							{/* Action Buttons */}
							<Grid size={12}>
								<Divider sx={{ my: 2 }} />
								<Stack
									direction={{ xs: "column", sm: "row" }}
									spacing={2}
									justifyContent="space-between"
								>
									{/* Back Button */}
									<Button
										variant="outlined"
										size="medium"
										startIcon={<ArrowBackIcon />}
										sx={{
											textTransform: "capitalize",
											borderColor:
												theme.palette.primary.main
										}}
										LinkComponent={Link}
										to="/departments"
									>
										{t("back")}
									</Button>

									{/* Create Button */}
									<Button
										type="submit"
										variant="contained"
										size="medium"
										startIcon={<SaveIcon />}
										sx={{
											textTransform: "capitalize"
										}}
									>
										{t("create")}
									</Button>
								</Stack>
							</Grid>
						</Grid>
					</Box>
				</Box>
			</Paper>
		</>
	)
}
