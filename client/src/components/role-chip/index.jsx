import { alpha, Box, Chip, useTheme } from "@mui/material"
import React from "react"
import { useTranslation } from "react-i18next"
import { getRoleConfig } from "~/constants/account.constants"

export default function RoleChip({ role, onDelete, size = "small" }) {
	const { t } = useTranslation("role")
	const { color, icon: Icon } = getRoleConfig(role)
	const theme = useTheme()

	return (
		<Chip
			onDelete={onDelete}
			label={
				<Box
					sx={{
						display: "flex",
						alignI1tems: "center",
						gap: 1

					}}
				>
					<Icon
						sx={{
							fontSize: 20
						}}
					/>
					{t(role)}
				</Box>
			}
			size={size}
			sx={{
				fontSize: "0.75rem",
				background: `linear-gradient(135deg, ${alpha(
					theme.palette[color].main,
					0.1
				)} 0%, ${alpha(theme.palette[color].main, 0.05)} 100%)`,
				color: theme.palette[color].main,
				fontWeight: 600,
				textTransform: "capitalize",
				border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`
			}}
		/>
	)
}

// const CHIP_COLOR = {
//   ADMIN: "error",
//   MANAGER: "info",
//   PM: "secondary",
//   ACCOUNTANT: "success",
//   HR: "warning",
//   HOD: "info",
//   SECRETARY: "info",
//   EMPLOYEE: "default",
//   CHIEFACCOUNTANT: "primary", // nhớ thêm role mới
// };

// export default function RoleChip({ role, label }) {
//   const color = CHIP_COLOR[role] ?? "default"; // fallback an toàn
//   return <Chip size="small" label={label ?? role} color={color} />;
// }