import {
	Box,
	Button,
	IconButton,
	InputAdornment,
	TextField,
	Typography,
	Paper,
	useTheme,
	alpha,
	Container,
	Stack,
	CircularProgress
} from "@mui/material"
import { useEffect, useRef, useState } from "react"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { Eye, EyeClosed, Lock, User, Shield } from "lucide-react"
import { fetchAccountDataApi, loginApi } from "~/services/auth.service"
import { useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"
import AOS from "aos"
import "aos/dist/aos.css"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { setAccount } from "~/libs/features/account/accountSlice"
import ReCAPTCHA from "react-google-recaptcha"
import SimplebarReact from "~/components/simplebar-react"

const schema = yup.object().shape({
	username: yup.string().required("username-is-required"),
	password: yup.string().required("password-is-required")
})

export default function Login() {
	const theme = useTheme()
	const { t } = useTranslation("login_page")
	const { t: tError } = useTranslation("errors")
	const dispatch = useDispatch()
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [captchaToken, setCaptchaToken] = useState("")
	const [captchaError, setCaptchaError] = useState(false)
	const recaptchaRef = useRef()

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors }
	} = useForm({
		resolver: yupResolver(schema)
	})

	const handleLogin = async (data) => {
		if (!captchaToken) {
			setCaptchaError(true)
			return
		}
		setCaptchaError(false)
		setLoading(true)
		const res = await loginApi({
			...data,
			captchaToken
		})
		setLoading(false)
		if (res.status !== 200) {
			// reset recaptcha
			if (recaptchaRef.current) {
				recaptchaRef.current.reset()
			}
			setCaptchaToken("")
			// set errors
			if (res.errors) {
				Object.entries(res.errors).forEach(([field, message]) => {
					setError(field, {
						type: "manual",
						message: message
					})
				})
			}
			dispatch(setPopup({ type: "error", message: res.message }))
		} else {
			localStorage.setItem("accessToken", res.data.accessToken)
			localStorage.setItem("refreshToken", res.data.refreshToken)
			const fetchAccountData = await fetchAccountDataApi(
				res.data.accessToken
			)
			if (fetchAccountData.status !== 200) {
				dispatch(
					setPopup({
						type: "error",
						message: fetchAccountData.message
					})
				)
			} else {
				dispatch(setAccount(fetchAccountData.data))
			}
		}
	}

	const handleClickShowPassword = () => {
		setShowPassword(!showPassword)
	}

	useEffect(() => {
		AOS.init({ duration: 1000 })
	}, [])

	return (
		<SimplebarReact>
			<title>{t("Login")}</title>
			<Box
				sx={{
					backgroundImage:
						"url('/images/background/background1.png')",
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
					width: "100%",
					minHeight: "100vh",
					bgcolor: "#fff",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					userSelect: "none",
					padding: "40px 0",
					overflow: "hidden",
					position: "relative"
				}}
			>
				<Box sx={{
					width: "100%",
					maxWidth: "500px"
				}}>
					<Paper
						data-aos="fade-up"
						elevation={0}
						sx={{
							borderRadius: 4,
							padding: { xs: 4, sm: 5 },
							background: `linear-gradient(145deg, 
                				${alpha(theme.palette.background.paper, 0.95)} 0%, 
                				${alpha(theme.palette.background.paper, 0.9)} 100%)`,
							backdropFilter: "blur(20px)",
							border: `1px solid ${alpha(
								theme.palette.primary.main,
								0.1
							)}`,
							boxShadow: `0 20px 40px ${alpha(
								theme.palette.common.black,
								0.1
							)}, 
                         0 0 0 1px ${alpha(theme.palette.primary.main, 0.05)}`,
							position: "relative",
							overflow: "hidden",
							"&::before": {
								content: '""',
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								height: "4px",
								background: `linear-gradient(90deg, 
                  					${theme.palette.primary.main} 0%, 
                  					${theme.palette.primary.light} 50%, 
                  					${theme.palette.primary.main} 100%)`
							}
						}}
					>
						{/* Header Section */}
						<Box sx={{ textAlign: "center", mb: 3 }}>
							<Box
								sx={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: 60,
									height: 60,
									borderRadius: "50%",
									background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
									mb: 2,
									boxShadow: `0 10px 30px ${alpha(
										theme.palette.primary.main,
										0.3
									)}`
								}}
							>
								<Shield size={35} color="white" />
							</Box>
							<Typography
								variant="h5"
								sx={{
									fontWeight: 700,
									color: theme.palette.primary.main,
									mb: 0.5
								}}
							>
								{t("Login")}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: theme.palette.text.secondary,
									fontWeight: 400
								}}
							>
								{t("Login with your account")}
							</Typography>
						</Box>

						{/* Form Section */}
						<form onSubmit={handleSubmit(handleLogin)}>
							<Stack spacing={3}>
								<TextField
									{...register("username")}
									helperText={tError(
										errors.username?.message || ""
									)}
									error={!!errors.username}
									disabled={loading}
									fullWidth
									type="text"
									label={t("Username")}
									autoComplete="off"
									sx={{
										"& .MuiOutlinedInput-root": {
											borderRadius: 3,
											backgroundColor:
												theme.palette.background
													.default,
											transition: "all 0.3s ease-in-out"
										}
									}}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<User />
											</InputAdornment>
										)
									}}
								/>

								<TextField
									{...register("password")}
									helperText={tError(
										errors.password?.message || ""
									)}
									error={!!errors.password}
									disabled={loading}
									fullWidth
									type={showPassword ? "text" : "password"}
									label={t("Password")}
									autoComplete="off"
									sx={{
										"& .MuiOutlinedInput-root": {
											borderRadius: 3,
											backgroundColor:
												theme.palette.background
													.default,
											transition: "all 0.3s ease-in-out"
										}
									}}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Lock />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													aria-label="toggle password visibility"
													onClick={
														handleClickShowPassword
													}
													edge="end"
													sx={{
														color: theme.palette
															.text.secondary,
														"&:hover": {
															color: theme.palette
																.primary.main,
															backgroundColor:
																alpha(
																	theme
																		.palette
																		.primary
																		.main,
																	0.1
																)
														}
													}}
												>
													{showPassword ? (
														<Eye />
													) : (
														<EyeClosed />
													)}
												</IconButton>
											</InputAdornment>
										)
									}}
								/>

								{/* ReCAPTCHA Section */}
								<Box
									sx={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: 1,
										p: 2,
										borderRadius: 3,
										backgroundColor: alpha(
											captchaError
												? theme.palette.error.main
												: theme.palette.primary.main,
											0.03
										),
										border: captchaError
											? `1px solid ${theme.palette.error.main}`
											: `1px solid ${alpha(
													theme.palette.primary.main,
													0.1
											  )}`,
										transition:
											"border-color 0.3s ease-in-out"
									}}
								>
									<ReCAPTCHA
										sitekey={
											import.meta.env
												.VITE_RECAPTCHA_SITE_KEY
										}
										ref={recaptchaRef}
										onChange={(token) => {
											setCaptchaToken(token)
											setCaptchaError(false)
										}}
									/>
									{captchaError && (
										<Typography
											variant="caption"
											sx={{
												color: theme.palette.error.main,
												textAlign: "center",
												fontWeight: 500
											}}
										>
											{t("PleaseVerifyCaptcha")}
										</Typography>
									)}
								</Box>

								{/* Login Button */}
								<Button
									fullWidth
									disabled={loading}
									type="submit"
									variant="contained"
									size={"medium"}
									sx={{
										textTransform: "capitalize"
									}}
									startIcon={
										loading ? (
											<CircularProgress
												size={20}
												color="inherit"
											/>
										) : null
									}
								>
									{loading ? t("Verifying") : t("Login")}
								</Button>
							</Stack>
						</form>

						{/* Footer */}
						<Box
							sx={{
								mt: 3,
								pt: 2,
								borderTop: `1px solid ${alpha(
									theme.palette.primary.main,
									0.1
								)}`,
								textAlign: "center"
							}}
						>
							<Typography
								variant="body2"
								sx={{
									color: theme.palette.text.secondary,
									fontSize: "0.9rem",
								}}
							>
								{t(
									"Accounts are provided by the administrator only"
								)}
							</Typography>
						</Box>
					</Paper>
				</Box>
			</Box>
		</SimplebarReact>
	)
}
