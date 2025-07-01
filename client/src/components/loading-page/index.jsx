import { Box, CircularProgress, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

export default function LoadingPage() {
	const { t } = useTranslation("loading_page")
	return (
		<Box
			sx={{
				backgroundImage: "url('/images/background/background1.png')",
				backgroundSize: "cover",
				backgroundPosition: "center",
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
				className="box-shadow"
				sx={{
					width: "100%",
					maxWidth: "300px",
					borderRadius: "10px",
					padding: "30px 20px",
					bgcolor: "#fff",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "column"
				}}
			>
				<img src="/images/favicon.ico" height={"40"} alt="logo" />
				<CircularProgress sx={{ mt: 6 }} />
				<Typography
					sx={{ mt: 6, color: "text.secondary", fontSize: "14px" }}
				>
					{t("Please wait a moment")}
				</Typography>
			</Box>
		</Box>
	)
}
