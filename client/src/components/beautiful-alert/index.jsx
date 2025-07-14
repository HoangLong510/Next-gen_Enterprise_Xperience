import { alpha, Box, Collapse, Typography, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"

import ErrorIcon from "@mui/icons-material/Error"
import SuccessIcon from "@mui/icons-material/CheckCircle"

const BeautifulAlert = ({ message, type = "error" }) => {
	const theme = useTheme()
	const { t } = useTranslation("messages")

	// Determine colors and icon based on type
	const isSuccess = type === "success"
	const colorMain = isSuccess
		? theme.palette.primary.main
		: theme.palette.error.main
	const colorDark = isSuccess
		? theme.palette.primary.dark
		: theme.palette.error.dark
	const IconComponent = isSuccess ? SuccessIcon : ErrorIcon

	return (
		<Collapse in={!!message}>
			<Box
				sx={{
					mb: 3,
					borderRadius: 2,
					overflow: "hidden",
					background: `linear-gradient(135deg, 
                        ${alpha(colorMain, 0.08)} 0%, 
                        ${alpha(colorMain, 0.04)} 100%)`,
					border: `1px solid ${alpha(colorMain, 0.2)}`,
					position: "relative",
					"&::before": {
						content: '""',
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						height: 4,
						background: `linear-gradient(90deg, 
                            ${colorMain} 0%, 
                            ${alpha(colorMain, 0.7)} 100%)`
					}
				}}
			>
				<Box
					sx={{
						p: 2.5,
						display: "flex",
						alignItems: "flex-start",
						gap: 2
					}}
				>
					{/* Icon */}
					<Box
						sx={{
							width: 40,
							height: 40,
							borderRadius: "50%",
							backgroundColor: colorMain,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							boxShadow: `0 4px 12px ${alpha(colorMain, 0.3)}`
						}}
					>
						<IconComponent sx={{ fontSize: 22, color: "white" }} />
					</Box>

					{/* Message Content */}
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Typography
							variant="subtitle2"
							sx={{
								fontWeight: 600,
								color: colorDark,
								mb: 0.5,
								textTransform: "capitalize"
							}}
						>
							{type}
						</Typography>
						<Typography
							variant="body2"
							sx={{
								color: colorDark,
								lineHeight: 1.5,
								wordBreak: "break-word"
							}}
						>
							{t(message)}
						</Typography>
					</Box>
				</Box>
			</Box>
		</Collapse>
	)
}

export default BeautifulAlert
