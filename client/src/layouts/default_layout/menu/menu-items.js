import ManageAccountsIcon from "@mui/icons-material/ManageAccounts"
import Diversity1Icon from "@mui/icons-material/Diversity1"
import SettingsIcon from "@mui/icons-material/Settings"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import AssignmentIcon from "@mui/icons-material/Assignment"
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd"
import FilePresentIcon from "@mui/icons-material/FilePresent"
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"
import TaskAltIcon from "@mui/icons-material/TaskAlt"

export const menuItems = [
	{
		title: "Management",
		items: [
			{
				label: "Finance",
				icon: AttachMoneyIcon,
				href: "/management/finance"
			},
			{
				label: "Accounts",
				icon: ManageAccountsIcon,
				href: "/management/accounts"
			},
			{
				label: "Settings",
				icon: SettingsIcon,
				href: "/management/settings"
			}
		]
	},
	{
		title: "Employees",
		items: [
			{
				label: "Profiles",
				icon: AssignmentIndIcon,
				href: "/employees/profiles"
			},
			{
				label: "Contracts",
				icon: FilePresentIcon,
				href: "/employees/contracts"
			}
		]
	},
	{
		title: "Utilities",
		items: [
			{
				label: "Departments",
				icon: Diversity1Icon,
				href: "/utilities/departments"
			},
			{
				label: "Projects",
				icon: AccountTreeIcon,
				href: "/utilities/projects"
			},
			{
				label: "Dispatches",
				icon: AssignmentIcon,
				href: "/utilities/dispatches"
			},
			{ label: "Tasks", icon: TaskAltIcon, href: "/utilities/tasks" }
		]
	}
]
