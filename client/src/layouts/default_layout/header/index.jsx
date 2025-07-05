import { Box, IconButton } from "@mui/material"
import { Menu, X } from "lucide-react"
import React from "react"
import { Link } from "react-router-dom"
import HeaderAuth from "./header-auth"
import HeaderNotifaication from "./header-notifaication"

export default function Header({ open, setOpen }) {
	const ToggleMenu = () => {
		setOpen(!open)
	}

	return (
		<Box
			sx={{
				zIndex: 1201,
				position: "fixed",
				top: "0",
				height: "60px",
				width: "100%",
				bgcolor: "background.default",
				boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.15)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "0px 20px"
			}}
		>
			<Box sx={{ display: { xs: "flex", md: "none" } }}>
				<IconButton onClick={() => ToggleMenu()}>
					{open ? <X /> : <Menu />}
				</IconButton>
			</Box>

			<Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
				<Link to="/" style={{ display: "flex", alignItems: "center" }}>
					<img src="/images/brand.png" alt="logo" height={25} />
				</Link>
			</Box>

			<Box sx={{ display: "flex", alignItems: "center", gap: "20px" }}>
				<HeaderNotifaication />
				<HeaderAuth />
				
			</Box>
		</Box>
	)
}
