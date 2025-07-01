import { useRef } from "react"
import { styled } from "@mui/material/styles"
import MuiDrawer from "@mui/material/Drawer"
import { Box } from "@mui/material"
import MenuList from "./menu-list"

const drawerWidth = 240

const openedMixin = (theme) => ({
	width: drawerWidth,
	transition: theme.transitions.create("width", {
		easing: theme.transitions.easing.sharp,
		duration: theme.transitions.duration.enteringScreen
	}),
	overflowX: "hidden"
})

const closedMixin = (theme) => ({
	transition: theme.transitions.create("width", {
		easing: theme.transitions.easing.sharp,
		duration: theme.transitions.duration.leavingScreen
	}),
	overflowX: "hidden",
	width: `calc(${theme.spacing(7)} + 1px)`,
	[theme.breakpoints.up("sm")]: {
		width: `calc(${theme.spacing(8)} + 1px)`
	}
})

const Drawer = styled(MuiDrawer, {
	shouldForwardProp: (prop) => prop !== "open"
})(({ theme, open }) => ({
	width: drawerWidth,
	flexShrink: 0,
	whiteSpace: "nowrap",
	boxSizing: "border-box",
	...(open
		? {
				...openedMixin(theme),
				"& .MuiDrawer-paper": openedMixin(theme)
		  }
		: {
				...closedMixin(theme),
				"& .MuiDrawer-paper": closedMixin(theme)
		  })
}))

const CustomBackdrop = styled(Box)(({ theme, open }) => ({
	position: "fixed",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	backgroundColor: "rgba(0, 0, 0, 0.4)",
	backdropFilter: "blur(4px)",
	zIndex: theme.zIndex.drawer - 1,
	opacity: open ? 1 : 0,
	visibility: open ? "visible" : "hidden",
	transition: theme.transitions.create(["opacity", "visibility"], {
		duration: theme.transitions.duration.standard
	}),
	pointerEvents: open ? "auto" : "none"
}))

export default function Menu({ open, setOpen }) {
	const hoverTimeout = useRef(null)

	const handleMouseEnter = () => {
		if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
		hoverTimeout.current = setTimeout(() => {
			setOpen(true)
		}, 100) // 100ms delay mở
	}

	const handleMouseLeave = () => {
		if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
		hoverTimeout.current = setTimeout(() => {
			setOpen(false)
		}, 300) // 300ms delay đóng
	}

	const handleBackdropClick = () => {
		setOpen(false)
	}

	return (
		<>
			{/* Custom Backdrop for Desktop */}
			<CustomBackdrop
				open={open}
				onClick={handleBackdropClick}
				sx={{ display: { md: "block", xs: "none" } }}
			/>

			<Drawer
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				variant="permanent"
				open={open}
				sx={{
					display: { md: "block", xs: "none" },
					"& .MuiDrawer-paper": {
						border: "none",
						boxShadow: "0 0px 15px rgba(0, 0, 0, 0.15)"
					}
				}}
			>
				<MenuList open={open} setOpen={setOpen} />
			</Drawer>

			<MuiDrawer
				open={open}
				sx={{ display: { md: "none", xs: "block" } }}
			>
				<Box sx={{ width: 250 }}>
					<MenuList open={open} setOpen={setOpen} />
				</Box>
			</MuiDrawer>
		</>
	)
}
