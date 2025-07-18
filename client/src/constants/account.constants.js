import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import PersonIcon from "@mui/icons-material/Person"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import GroupIcon from "@mui/icons-material/Group"

export const ROLE_CONFIGS = [
	{
		value: "ADMIN",
		color: "error",
		icon: AdminPanelSettingsIcon
	},
	{
		value: "MANAGER",
		color: "warning",
		icon: EmojiEventsIcon
	},
	{
		value: "PM",
		color: "info",
		icon: AccountTreeIcon
	},
	{
		value: "ACCOUNTANT",
		color: "success",
		icon: TrendingUpIcon
	},
	{
		value: "HOD",
		color: "secondary",
		icon: SupervisorAccountIcon
	},
	{
		value: "EMPLOYEE",
		color: "primary",
		icon: PersonIcon
	},
	{
		value: "HR",
		color: "primary",
		icon: GroupIcon
	}
]

export function getRoleConfig(roleValue) {
	return ROLE_CONFIGS.find((role) => role.value === roleValue) || {}
}
