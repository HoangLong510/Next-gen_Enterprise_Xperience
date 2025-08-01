import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
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
	FormHelperText,
	alpha
} from "@mui/material"
import {
	Business as BusinessIcon,
	Save as SaveIcon,
	ArrowBack as ArrowBackIcon
} from "@mui/icons-material"
import { Link, useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { useTranslation } from "react-i18next"
import { ROLE_CONFIGS } from "~/constants/account.constants"
import RoleChip from "~/components/role-chip"
import { createEmployeeApi } from "~/services/employee.service"
import { formatDateToYYYYMMDD } from "~/utils/function"

const schema = yup.object({
	username: yup
		.string()
		.required("username-is-required")
		.min(6, "username-must-be-between-5-and-30-characters")
		.max(30, "username-must-be-between-5-and-30-characters")
		.matches(
			/^[a-z][a-z0-9]*$/,
			"username-must-start-with-a-lowercase-letter-and-contain-only-lowercase-letters-and-numbers"
		),
	password: yup
		.string()
		.required("password-is-required")
		.min(6, "password-must-be-between-6-and-30-characters")
		.max(30, "password-must-be-between-6-and-30-characters"),
	confirmPassword: yup
		.string()
		.required("confirm-password-is-required")
		.oneOf([yup.ref("password")], "confirm-password-does-not-match"),
	firstName: yup
		.string()
		.required("first-name-is-required")
		.min(2, "first-name-must-be-between-2-and-30-characters")
		.max(30, "first-name-must-be-between-2-and-30-characters")
		.matches(
			/^[\p{L}\s]+$/u,
			"first-name-must-contain-only-letters-and-spaces"
		),
	lastName: yup
		.string()
		.required("last-name-is-required")
		.min(2, "last-name-must-be-between-2-and-30-characters")
		.max(30, "last-name-must-be-between-2-and-30-characters")
		.matches(
			/^[\p{L}\s]+$/u,
			"last-name-must-contain-only-letters-and-spaces"
		),
	email: yup
		.string()
		.required("email-is-required")
		.email("invalid-email-address"),
	phone: yup
		.string()
		.required("phone-is-required")
		.matches(
			/^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/,
			"invalid-phone-number"
		),
	address: yup.string().required("address-is-required"),
	gender: yup
		.string()
		.required("gender-is-required")
		.oneOf(["MALE", "FEMALE", "ORTHER"], "invalid-gender"),
	dateBirth: yup
		.date()
		.required("date-of-birth-cannot-be-null")
		.max(new Date(), "date-of-birth-must-be-in-the-past"),
	role: yup
		.string()
		.required("role-is-required")
		.oneOf(
			["ADMIN", "MANAGER", "PM", "HR", "ACCOUNTANT", "HOD", "EMPLOYEE"],
			"invalid-role"
		)
})

export default function CreateAccountManagementPage() {
	const theme = useTheme()
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const { t } = useTranslation("accounts_management_page")
	const { t: tError } = useTranslation("errors")

	const [loading, setLoading] = useState(false)

	const {
		control,
		handleSubmit,
		setError,
		formState: { errors }
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			username: "",
			password: "",
			confirmPassword: "",
			firstName: "",
			lastName: "",
			email: "",
			phone: "",
			address: "",
			gender: "",
			dateBirth: "",
			role: ""
		}
	})

	const onSubmit = async (data) => {
		setLoading(true)
		const res = await createEmployeeApi({
			...data,
			dateBirth: formatDateToYYYYMMDD(data.dateBirth)
		})
		setLoading(false)

		if (res.status === 201) {
			dispatch(
				setPopup({
					type: "success",
					message: res.message
				})
			)
			navigate("/management/accounts")
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

	return (
		<>
			<title>{t("create-account")}</title>

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
							{t("create-account")}
						</Typography>
						<Typography variant="body2">
							{t("create-an-account-for-employee")}
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
					<Box
						component="form"
						onSubmit={handleSubmit(onSubmit)}
						noValidate
					>
						<Grid container spacing={4}>
							{/* Information */}
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
											{t("information")}
										</Typography>
									</Stack>
									<Divider />
								</Stack>
							</Grid>

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="firstName"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("first-name")}
											variant="outlined"
											fullWidth
											error={!!errors.firstName}
											helperText={tError(
												errors.firstName?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="lastName"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("last-name")}
											variant="outlined"
											fullWidth
											error={!!errors.lastName}
											helperText={tError(
												errors.lastName?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="email"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label="Email"
											variant="outlined"
											fullWidth
											error={!!errors.email}
											helperText={tError(
												errors.email?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="phone"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("phone-number")}
											variant="outlined"
											fullWidth
											error={!!errors.phone}
											helperText={tError(
												errors.phone?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="dateBirth"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											type="date"
											label={t("date-of-birth")}
											variant="outlined"
											fullWidth
											error={!!errors.dateBirth}
											helperText={tError(
												errors.dateBirth?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="gender"
									control={control}
									render={({ field }) => (
										<FormControl
											fullWidth
											size="small"
											error={!!errors.gender}
										>
											<InputLabel shrink>
												{t("gender")}
											</InputLabel>
											<Select
												displayEmpty
												{...field}
												label={t("gender")}
												disabled={loading}
												sx={{
													borderRadius: 2,
													backgroundColor:
														theme.palette.background
															.default
												}}
											>
												<MenuItem value="">
													<Typography
														sx={{
															color: theme.palette
																.text.secondary
														}}
													>
														--- {t("select-gender")}{" "}
														---
													</Typography>
												</MenuItem>
												<MenuItem value="MALE">
													{t("male")}
												</MenuItem>
												<MenuItem value="FEMALE">
													{t("female")}
												</MenuItem>
												<MenuItem value="ORTHER">
													{t("other")}
												</MenuItem>
											</Select>
											{errors.gender && (
												<FormHelperText>
													{errors.gender.message}
												</FormHelperText>
											)}
										</FormControl>
									)}
								/>
							</Grid>

							<Grid size={12}>
								<Controller
									name="address"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("address")}
											fullWidth
											multiline
											rows={3}
											error={!!errors.address}
											helperText={tError(
												errors.address?.message
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

							{/* Account */}
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
											{t("account")}
										</Typography>
									</Stack>
									<Divider />
								</Stack>
							</Grid>

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="role"
									control={control}
									render={({ field }) => (
										<FormControl
											fullWidth
											size="small"
											error={!!errors.role}
										>
											<InputLabel shrink>
												{t("role")}
											</InputLabel>
											<Select
												displayEmpty
												{...field}
												disabled={loading}
												label={t("role")}
												sx={{
													borderRadius: 2,
													backgroundColor:
														theme.palette.background
															.default
												}}
											>
												<MenuItem value="">
													<Typography
														sx={{
															color: theme.palette
																.text.secondary
														}}
													>
														--- {t("select-role")}{" "}
														---
													</Typography>
												</MenuItem>
												{ROLE_CONFIGS.map((role) => (
													<MenuItem
														key={role.value}
														value={role.value}
													>
														<RoleChip
															role={role.value}
														/>
													</MenuItem>
												))}
											</Select>
											{errors.role && (
												<FormHelperText>
													{errors.role.message}
												</FormHelperText>
											)}
										</FormControl>
									)}
								/>
							</Grid>

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="username"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											label={t("username")}
											variant="outlined"
											fullWidth
											error={!!errors.username}
											helperText={tError(
												errors.username?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="password"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											type="password"
											label={t("password")}
											variant="outlined"
											fullWidth
											error={!!errors.password}
											helperText={tError(
												errors.password?.message
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

							<Grid size={{ xs: 12, md: 6 }}>
								<Controller
									name="confirmPassword"
									control={control}
									render={({ field }) => (
										<TextField
											{...field}
											size="small"
											type="password"
											label={t("confirm-password")}
											variant="outlined"
											fullWidth
											error={!!errors.confirmPassword}
											helperText={tError(
												errors.confirmPassword?.message
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
										disabled={loading}
										LinkComponent={Link}
										to="/management/accounts"
									>
										{t("back")}
									</Button>

									{/* Create Button */}
									<Button
										type="submit"
										variant="contained"
										size="medium"
										disabled={loading}
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
