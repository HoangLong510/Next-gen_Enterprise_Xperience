import { useMediaQuery, useTheme } from "@mui/material"
import React from "react"
import SimpleBar from "simplebar-react"
import "simplebar/dist/simplebar.min.css"
import "~/styles/simplebar.css"

export default function SimplebarReact({ children }) {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

	if (isMobile) {
		return <div style={{ height: "100%" }}>{children}</div>
	}

	return (
		<div style={{ height: "100%" }}>
			<SimpleBar style={{ maxHeight: "100vh" }}>{children}</SimpleBar>
		</div>
	)
}
