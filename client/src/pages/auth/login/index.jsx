import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	InputAdornment,
	TextField,
	Typography
} from "@mui/material"
import { useEffect, useState } from "react"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { Eye, EyeClosed, Lock, User } from "lucide-react"
import { Link } from "react-router-dom"
import { fetchAccountDataApi, loginApi } from "~/services/auth.service"
import { useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"
import AOS from "aos"
import "aos/dist/aos.css"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { setAccount } from "~/libs/features/account/accountSlice"
import {Helmet} from "react-helmet-async";

const schema = yup.object().shape({
	username: yup.string().required("username-is-required"),
	password: yup.string().required("password-is-required")
})

export default function Login() {
	const { t } = useTranslation("login_page")
	const { t: tError } = useTranslation("errors")
	const dispatch = useDispatch()
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	const {
		register,
		handleSubmit,
		setError,
		formState: { errors }
	} = useForm({
		resolver: yupResolver(schema)
	})

	const handleLogin = async (data) => {
		setLoading(true)
		const res = await loginApi(data)
		setLoading(false)
		if (res.status !== 200) {
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
		<>
			<Helmet>
				<title>{t("Login")}</title>
			</Helmet>
			<Box
				sx={{
					backgroundImage: "url('/images/background/background1.png')",
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
					padding: "40px 20px",
					overflow: "hidden"
				}}
			>
				<Box
					data-aos="fade-up"
					sx={{
						width: "100%",
						maxWidth: "450px",
						borderRadius: "10px",
						padding: "30px 20px",
						bgcolor: "#fff",
						boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)"
					}}
				>
					<Box sx={{ width: "100%", mb: 2 }}>
						<Typography
							sx={{
								fontSize: "20px",
								fontWeight: 600,
								color: "#000"
							}}
						>
							{t("Login")}
						</Typography>
						<Typography sx={{ mt: 1, fontSize: "14px", color: "#666" }}>
							{t("Login with your account")}
						</Typography>
					</Box>
					<form onSubmit={handleSubmit(handleLogin)}>
						<TextField
							{...register("username")}
							helperText={tError(errors.username?.message || "")}
							error={!!errors.username}
							disabled={loading}
							fullWidth
							type="text"
							label={t("Username")}
							margin="normal"
							autoComplete="off"
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<User />
									</InputAdornment>
								),
								sx: {
									backgroundColor: "background.default"
								}
							}}
						/>

						<TextField
							{...register("password")}
							helperText={tError(errors.password?.message || "")}
							error={!!errors.password}
							disabled={loading}
							fullWidth
							type={showPassword ? "text" : "password"}
							label={t("Password")}
							autoComplete="off"
							margin="normal"
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
											onClick={handleClickShowPassword}
											edge="end"
										>
											{showPassword ? <Eye /> : <EyeClosed />}
										</IconButton>
									</InputAdornment>
								)
							}}
						/>

						<Box
							sx={{
								mt: 2,
								display: "flex",
								width: "100%",
								justifyContent: "flex-end",
								alignItems: "center"
							}}
						>
							<Link
								to="/auth/forgot-password"
								style={{ textDecoration: "none" }}
							>
								<Typography
									sx={{
										textDecoration: "none",
										fontSize: "14px",
										color: "text.secondary",
										"&:hover": {
											textDecoration: "underline"
										}
									}}
								>
									{t("Forgot password")}?
								</Typography>
							</Link>
						</Box>

						<Button
							sx={{ textTransform: "none", mt: 3 }}
							fullWidth
							disabled={loading}
							type="submit"
							variant="contained"
							startIcon={
								loading ? (
									<CircularProgress size={20} color="inherit" />
								) : null
							}
						>
							{loading ? t("Verifying") : t("Login")}
						</Button>

						<Box
							sx={{
								mt: 3,
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								color: "#666",
								fontSize: "13px"
							}}
						>
							{t("Accounts are provided by the administrator only")}
						</Box>
					</form>
				</Box>
			</Box>
		</>
	)
}
