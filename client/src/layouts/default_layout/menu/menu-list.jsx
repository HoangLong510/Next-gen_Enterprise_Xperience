import {
	Box,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
	Collapse,
	styled,
	alpha,
	Chip
} from "@mui/material"
import { menuItems } from "./menu-items"
import { Link, useLocation } from "react-router-dom"
import {useSelector} from "react-redux";

const StyledListItemButton = styled(ListItemButton, {
	shouldForwardProp: (prop) => prop !== "isActive"
})(({ theme, isActive }) => ({
	minHeight: 52,
	margin: theme.spacing(0.5, 1),
	paddingLeft: theme.spacing(2),
	paddingRight: theme.spacing(2),
	borderRadius: theme.spacing(1.5),
	color: theme.palette.text.secondary,
	position: "relative",
	overflow: "hidden",
	transition: "all 150ms ease-out",

	"&::before": {
		content: '""',
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		background: `linear-gradient(135deg, ${alpha(
			theme.palette.primary.main,
			0.1
		)}, ${alpha(theme.palette.primary.light, 0.05)})`,
		opacity: 0,
		transition: "opacity 150ms ease-out",
		zIndex: 0
	},

	"&:hover": {
		backgroundColor: alpha(theme.palette.primary.main, 0.04),
		color: theme.palette.primary.main,
		transform: "translate3d(2px, 0, 0)",
		boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.1)}`,

		"&::before": {
			opacity: 1
		},

		"& .MuiListItemIcon-root": {
			transform: "scale(1.05)",
			color: theme.palette.primary.main
		},

		"& .MuiListItemText-primary": {
			color: theme.palette.primary.main,
			fontWeight: 600
		}
	},

	...(isActive && {
		backgroundColor: alpha(theme.palette.primary.main, 0.1),
		color: theme.palette.primary.main,
		fontWeight: 600,
		boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.15)}`,

		"&::before": {
			opacity: 1
		},

		"&::after": {
			content: '""',
			position: "absolute",
			right: theme.spacing(1),
			top: "50%",
			transform: "translateY(-50%)",
			width: 4,
			height: 20,
			backgroundColor: theme.palette.primary.main,
			borderRadius: 2,
			boxShadow: `0 0 6px ${alpha(theme.palette.primary.main, 0.3)}`
		},

		"& .MuiListItemIcon-root": {
			color: theme.palette.primary.main,
			transform: "scale(1.05)"
		},

		"& .MuiListItemText-primary": {
			color: theme.palette.primary.main,
			fontWeight: 600
		},

		"&:hover": {
			backgroundColor: alpha(theme.palette.primary.main, 0.12),
			transform: "translate3d(1px, 0, 0)"
		}
	})
}))

const StyledListSubheader = styled(ListSubheader)(({ theme }) => ({
	fontSize: "0.75rem",
	fontWeight: 700,
	textTransform: "uppercase",
	letterSpacing: "1px",
	color: theme.palette.text.disabled,
	backgroundColor: "transparent",
	lineHeight: 2.8,
	paddingLeft: theme.spacing(2.5),
	paddingRight: theme.spacing(2.5),
	position: "relative",

	"&::after": {
		content: '""',
		position: "absolute",
		bottom: theme.spacing(0.5),
		left: theme.spacing(2.5),
		right: theme.spacing(2.5),
		height: 1,
		background: `linear-gradient(90deg, ${alpha(
			theme.palette.divider,
			0.3
		)}, transparent)`
	}
}))

const StyledListItemIcon = styled(ListItemIcon)(() => ({
	minWidth: 0,
	justifyContent: "center",
	transition: "transform 150ms ease-out, color 150ms ease-out",
	position: "relative",
	zIndex: 1
}))

const MenuSection = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(1),

	"&:last-child": {
		marginBottom: 0
	}
}))

const MenuList = ({ open, setOpen }) => {
	const account = useSelector((state) => state.account.value)
	const location = useLocation()
	const pathname = location.pathname

	return (
		<Box
			sx={{
				mt: 8,
				pb: 2,
				height: "calc(100vh - 64px)",
				overflowY: "auto",
				overflowX: "hidden",
				"&::-webkit-scrollbar": {
					width: 6
				},
				"&::-webkit-scrollbar-track": {
					backgroundColor: "transparent"
				},
				"&::-webkit-scrollbar-thumb": {
					backgroundColor: alpha("#000", 0.1),
					borderRadius: 3,
					"&:hover": {
						backgroundColor: alpha("#000", 0.2)
					}
				}
			}}
		>
			{menuItems.map((section) => {
				// Lọc các item con theo role
				const visibleItems = section.items.filter(item =>
					item.roles.includes(account.role) // hoặc dùng .some nếu account.role là mảng
				);

				// Nếu không có item nào hợp lệ thì bỏ qua section này
				if (visibleItems.length === 0) return null;

				return (
					<MenuSection key={section.title}>
						<List
							subheader={
								<Collapse in={open} timeout={{ enter: 150, exit: 100 }} unmountOnExit>
									<StyledListSubheader component="div">
										{section.title}
									</StyledListSubheader>
								</Collapse>
							}
							sx={{ py: 0 }}
						>
							{visibleItems.map((item) => {
								const Icon = item.icon;
								const isActive = pathname === item.href;

								return (
									<ListItem key={item.label} disablePadding sx={{ display: "block", mb: 0.5 }}>
										<Link
											to={item.href}
											onClick={() => setOpen(false)}
											style={{ textDecoration: "none", color: "inherit" }}
										>
											<StyledListItemButton
												isActive={isActive}
												sx={{
													justifyContent: open ? "initial" : "center",
													minHeight: open ? 52 : 48
												}}
											>
												<StyledListItemIcon sx={{ mr: open ? 2.5 : "auto" }}>
													<Icon
														fontSize="small"
														sx={{ fontSize: open ? "1.25rem" : "1.1rem" }}
													/>
												</StyledListItemIcon>

												<ListItemText
													primary={item.label}
													sx={{
														opacity: open ? 1 : 0,
														transition: "all 150ms ease-out",
														transform: open ? "translateX(0)" : "translateX(-8px)",
														position: "relative",
														zIndex: 1
													}}
													primaryTypographyProps={{
														fontSize: "0.875rem",
														fontWeight: isActive ? 600 : 500,
														lineHeight: 1.2,
														sx: {
															transition: "color 150ms ease-out, font-weight 150ms ease-out"
														}
													}}
												/>

												{item.isNew && open && (
													<Chip
														label="New"
														size="small"
														sx={{
															height: 20,
															fontSize: "0.65rem",
															fontWeight: 600,
															backgroundColor: (theme) => theme.palette.success.main,
															color: "white",
															ml: 1,
															"& .MuiChip-label": {
																px: 1
															}
														}}
													/>
												)}
											</StyledListItemButton>
										</Link>
									</ListItem>
								);
							})}
						</List>
					</MenuSection>
				);
			})}
		</Box>
	)
}

export default MenuList
