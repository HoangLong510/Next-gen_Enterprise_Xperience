import React, { useEffect, useRef } from "react"
import { useMediaQuery, useTheme } from "@mui/material"
import SimpleBar from "simplebar-react"
import { useLocation } from "react-router-dom"
import "simplebar/dist/simplebar.min.css"
import "~/styles/simplebar.css"

export default function SimplebarReact({ children }) {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
	const simpleBarRef = useRef()
	const { pathname } = useLocation()

	useEffect(() => {
		if (!isMobile && simpleBarRef.current) {
			simpleBarRef.current.getScrollElement().scrollTo(0, 0)
		} else {
			window.scrollTo(0, 0)
		}
	}, [pathname, isMobile])

	if (isMobile) {
		return <div style={{ height: "100%" }}>{children}</div>
	}

	return (
		<div style={{ height: "100%" }}>
			<SimpleBar ref={simpleBarRef} style={{ maxHeight: "100vh" }}>
				{children}
			</SimpleBar>
		</div>
	)
}
