import ManageAccountsIcon from "@mui/icons-material/ManageAccounts"
import Diversity1Icon from "@mui/icons-material/Diversity1"
import SettingsIcon from "@mui/icons-material/Settings"
import AssignmentIcon from "@mui/icons-material/Assignment"
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd"
import FilePresentIcon from "@mui/icons-material/FilePresent"
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"
import TaskAltIcon from "@mui/icons-material/TaskAlt"
import DescriptionIcon from "@mui/icons-material/Description"
import WorkIcon from '@mui/icons-material/Work';
import { PunchClock } from "@mui/icons-material"
export const menuItems = [
	{
		title: "Management",
		items: [
			{
				label: "Finance",
				icon: AttachMoneyIcon,
				href: "/management/finance",
				roles: ["ADMIN", "MANAGER", "ACCOUNTANT"]
			},
			{
				label: "Accounts",
				icon: ManageAccountsIcon,
				href: "/management/accounts",
				roles: ["ADMIN"]
			},
			{
				label: "Settings",
				icon: SettingsIcon,
				href: "/management/settings",
				roles: ["ADMIN"]
			}
		]
	},
	{
		title: "Employees",
		items: [
			{
				label: "Profiles",
				icon: AssignmentIndIcon,
				href: "/employees/profiles",
				roles: ["ADMIN", "MANAGER"]
			},
			{
				label: "Contracts",
				icon: FilePresentIcon,
				href: "/employees/contracts",
				roles: ["ADMIN", "MANAGER"]
			},
			{
				label: "Attendace",
				icon: PunchClock,
				href: "/attendance/list",
				roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"]
			}
		]
	},
	{
		title: "Utilities",
		items: [
			{
				label: "Departments",
				icon: Diversity1Icon,
				href: "/departments",
				roles: ["ADMIN", "MANAGER", "HOD", "EMPLOYEE"]
			},
			{
				label: "Projects",
				icon: WorkIcon,
				href: "/management/projects",
				roles: ["ADMIN", "MANAGER", "PM"]
			},
			{
				label: "Dispatches",
				icon: AssignmentIcon,
				href: "/management/documents",
				roles: ["ADMIN", "MANAGER", "PM"]
			},
			{
				label: "Tasks",
				icon: TaskAltIcon,
				href: "/utilities/tasks",
				roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"]
			},
			{
				label: "Leave Request",
				icon: DescriptionIcon,
				href: "/leave-request",
				roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"]
			},

		]
	}
]
