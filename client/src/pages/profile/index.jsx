import React from "react"
import { Box, Typography, Chip, Avatar, IconButton, alpha } from "@mui/material"
import {
	Email,
	Phone,
	LocationOn,
	Work,
	Cake,
	Person,
	PhotoCamera,
	Edit
} from "@mui/icons-material"
import { useSelector } from "react-redux"

export default function Profile() {
	const account = useSelector((state) => state.account.value)
	const fileInputRef = React.useRef(null)

	const handleFileSelect = () => {
		fileInputRef.current?.click()
	}

	const handleAvatarChange = (event) => {
		const file = event.target.files[0]
		if (file) {
			console.log(file)
		}
	}

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		})
	}

	const fullName = `${account.firstName} ${account.lastName}`

	const initials = fullName
		? fullName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
		: "U"

	return (
		<Box
			sx={{
				backgroundColor: "transparent"
			}}
		>
			{/* Profile Header */}
			<Box
				sx={{
					display: "flex",
					flexDirection: { xs: "column", md: "row" },
					gap: 4
				}}
			>
				<Box
					sx={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<Box
						sx={{
							width: "100%",
							borderRadius: 3,
							boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.15)",
							px: 2,
							py: 3,
							background: (theme) =>
								`linear-gradient(135deg, ${alpha(
									theme.palette.primary.main,
									0.05
								)} 0%, ${alpha(
									theme.palette.primary.light,
									0.01
								)} 100%)`,
							border: (theme) =>
								`1px solid ${alpha(
									theme.palette.primary.main,
									0.08
								)}`
						}}
					>
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 2
							}}
						>
							<Box
								sx={{
									position: "relative",
									cursor: "pointer",
									"&:hover .avatar-overlay": {
										opacity: 1
									},
									"&:hover .avatar-main": {
										transform: "scale(1.05)"
									}
								}}
								onClick={handleFileSelect}
							>
								<Avatar
									className="avatar-main"
									sx={{
										width: 120,
										height: 120,
										background: (theme) =>
											`linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
										fontSize: "2rem",
										fontWeight: 600,
										border: "4px solid white",
										boxShadow:
											"0 8px 32px rgba(0,0,0,0.15)",
										transition: "all 0.3s ease-in-out"
									}}
									src={account.avatar}
								>
									{initials}
								</Avatar>

								{/* Hover Overlay */}
								<Box
									className="avatar-overlay"
									sx={{
										position: "absolute",
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										borderRadius: "50%",
										backgroundColor: "rgba(0, 0, 0, 0.6)",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										opacity: 0,
										transition: "opacity 0.3s ease-in-out",
										color: "white"
									}}
								>
									<PhotoCamera
										sx={{ fontSize: "2rem", mb: 0.5 }}
									/>
									<Typography
										variant="caption"
										sx={{
											fontWeight: 600,
											textAlign: "center"
										}}
									>
										Change Avatar
									</Typography>
								</Box>

								{/* Edit Icon */}
								<IconButton
									sx={{
										position: "absolute",
										bottom: 0,
										right: 0,
										backgroundColor: "primary.main",
										color: "white",
										width: 36,
										height: 36,
										"&:hover": {
											backgroundColor: "primary.dark",
											transform: "scale(1.1)"
										},
										transition: "all 0.2s ease-in-out",
										boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
									}}
									size="small"
								>
									<Edit fontSize="small" />
								</IconButton>
							</Box>

							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleAvatarChange}
								style={{ display: "none" }}
							/>

							<Typography
								variant="body2"
								color="text.secondary"
								textAlign="center"
							>
								Click on avatar to change photo
								<br />
								<Typography
									component="span"
									variant="caption"
									color="text.disabled"
								>
									Supported: JPG, PNG, GIF (Max 5MB)
								</Typography>
							</Typography>
						</Box>

						<Box
							sx={{
								mt: 3,
								width: "100%",
								display: "flex",
								flexDirection: "column",
								alignItems: "center"
							}}
						>
							<Typography
								variant="body1"
								sx={{
									fontWeight: 600,
									color: "text.primary",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									textTransform: "capitalize",
									fontSize: "1rem"
								}}
							>
								{fullName}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: "text.secondary",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									display: "block",
									fontSize: "0.85rem",
									fontWeight: 500
								}}
							>
								@{account.username}
							</Typography>

							<Chip
								label={account.role.toLowerCase()}
								sx={{
									mt: 1,
									height: 30,
									fontSize: "0.75rem",
									background: (theme) =>
										`linear-gradient(135deg, ${alpha(
											theme.palette.primary.main,
											0.15
										)} 0%, ${alpha(
											theme.palette.primary.light,
											0.05
										)} 100%)`,
									color: "primary.main",
									fontWeight: 600,
									textTransform: "capitalize",
									border: (theme) =>
										`1px solid ${alpha(
											theme.palette.primary.main,
											0.2
										)}`
								}}
							/>
						</Box>
					</Box>

					<Box
						sx={{
							mt: 2,
							px: 2,
							py: 3,
							width: "100%",
							height: "100%",
							backgroundColor: "background.default",
							boxShadow: "0px 0px 15px rgba(0, 0, 0, 0.15)",
							borderRadius: 3
						}}
					>
						<Box
							sx={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 1.5,
								borderRadius: 2,
								px: 2,
								py: 1
							}}
						>
							<Work
								sx={{
									color: "primary.main",
									fontSize: "1.25rem"
								}}
							/>
							<Box>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block" }}
								>
									Department
								</Typography>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500 }}
								>
									{account.department || "N/A"}
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 1.5,
								borderRadius: 2,
								px: 2,
								py: 1
							}}
						>
							<Cake
								sx={{
									color: "primary.main",
									fontSize: "1.25rem"
								}}
							/>
							<Box>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block" }}
								>
									Date of Birth
								</Typography>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500 }}
								>
									{account.birthDate
										? formatDate(account.birthDate)
										: "N/A"}
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 1.5,
								borderRadius: 2,
								px: 2,
								py: 1
							}}
						>
							<Person
								sx={{
									color: "primary.main",
									fontSize: "1.25rem"
								}}
							/>
							<Box>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block" }}
								>
									Gender
								</Typography>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500 }}
								>
									{account.gender}
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 1.5,
								borderRadius: 2,
								px: 2,
								py: 1
							}}
						>
							<Email
								sx={{
									color: "primary.main",
									fontSize: "1.25rem"
								}}
							/>
							<Box>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block" }}
								>
									Email Address
								</Typography>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500 }}
								>
									{account.email}
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 1.5,
								borderRadius: 2,
								px: 2,
								py: 1
							}}
						>
							<Phone
								sx={{
									color: "primary.main",
									fontSize: "1.25rem"
								}}
							/>
							<Box>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block" }}
								>
									Phone Number
								</Typography>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500 }}
								>
									{account.phone}
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 1.5,
								borderRadius: 2,
								px: 2,
								py: 1
							}}
						>
							<LocationOn
								sx={{
									color: "primary.main",
									fontSize: "1.25rem"
								}}
							/>
							<Box>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{ display: "block" }}
								>
									Address
								</Typography>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500 }}
								>
									{account.address}
								</Typography>
							</Box>
						</Box>
					</Box>
				</Box>

				<Box sx={{ flex: 1 }}>{/* form edit */}</Box>
			</Box>
		</Box>
	)
}
