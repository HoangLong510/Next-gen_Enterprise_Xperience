import { Box } from "@mui/material"
import React from "react"
import Menu from "./menu"
import Header from "./header"
import SimplebarReact from "~/components/simplebar-react"

export default function DefaultLayout({ children }) {
	const [open, setOpen] = React.useState(false)

	return (
		<SimplebarReact>
			<Box sx={{ width: "100%" }}>
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
							backgroundColor: "#f9f9f9"
						}}
					>
						{children}
					</Box>
				</Box>
			</Box>
		</SimplebarReact>
	)
}
