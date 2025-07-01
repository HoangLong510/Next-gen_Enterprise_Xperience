import React from "react"
import { Avatar, Box, Typography, IconButton } from "@mui/material"
import { PhotoCamera, Edit } from "@mui/icons-material"

export default function AvatarUpload({ avatar, name, onAvatarChange }) {
	const fileInputRef = React.useRef(null)
	const [previewUrl, setPreviewUrl] = React.useState(avatar)

	const handleFileSelect = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = (event) => {
		const file = event.target.files[0]
		if (file) {
			// Create preview URL
			const url = URL.createObjectURL(file)
			setPreviewUrl(url)

			// Call parent callback
			if (onAvatarChange) {
				onAvatarChange(file, url)
			}
		}
	}

	const initials = name
		? name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
		: "U"

	return (
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
						boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
						transition: "all 0.3s ease-in-out"
					}}
					src={previewUrl}
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
					<PhotoCamera sx={{ fontSize: "2rem", mb: 0.5 }} />
					<Typography
						variant="caption"
						sx={{ fontWeight: 600, textAlign: "center" }}
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
				onChange={handleFileChange}
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
	)
}
