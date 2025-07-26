import {alpha, Box, useTheme} from "@mui/material"
import React from "react"
import Menu from "./menu"
import Header from "./header"
import SimplebarReact from "~/components/simplebar-react"

export default function DefaultLayout({ children }) {
	const [open, setOpen] = React.useState(false)
	const theme = useTheme()

	return (
		<SimplebarReact style={{ width: "100%", overflowX: "hidden" }}>
			<Box sx={{ width: "100%", overflowX: "hidden" }}>
				{/* Header */}
				<Header open={open} setOpen={setOpen} />

				<Box sx={{ display: "flex" }}>
					{/* Menu */}
					<Menu open={open} setOpen={setOpen} />

					{/* Content */}
					<Box
						sx={{
							width: "100%",
							flexGrow: 1,
							mt: "60px",
							minHeight: "calc(100vh - 60px)",
							padding: "25px",
							background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 50%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
						}}
					>
						{children}
					</Box>
				</Box>
			</Box>
		</SimplebarReact>
	)
}
