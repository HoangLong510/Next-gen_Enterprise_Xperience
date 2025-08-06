import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import Diversity1Icon from "@mui/icons-material/Diversity1";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import GavelIcon from '@mui/icons-material/Gavel';
import ChatIcon from '@mui/icons-material/Chat';
import WorkIcon from '@mui/icons-material/Work';
import { PunchClock } from "@mui/icons-material";

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
    title: "Finance",
    items: [
      {
        label: "Fund",
        icon: AssignmentIndIcon,
        href: "/finance/fund",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
        label: "Salary",
        icon: FilePresentIcon,
        href: "/finance/salary",
        roles: ["ADMIN", "MANAGER"],

      },
    ],
  },
  {
    title: "Utilities",
    items: [
      {
        label: "Departments",
        icon: Diversity1Icon,
        href: "/departments",
        roles: ["ADMIN", "MANAGER", "HOD", "EMPLOYEE"],
      },
      {
        label: "Projects",
        // Chọn icon và đường dẫn phù hợp: 
        // Nếu muốn icon chuẩn nghiệp vụ: AccountTreeIcon + đường dẫn /utilities/projects (giống bản web của bạn)
        icon: AccountTreeIcon,
        href: "/utilities/projects",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
      },
      {
        label: "Dispatches",
        icon: AssignmentIcon,
        href: "/utilities/dispatches",
        roles: ["ADMIN", "MANAGER", "PM"],
      },
      {
        label: "Tasks",
        icon: TaskAltIcon,
        href: "/utilities/tasks",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
      },
      {
        label: "Leave Request",
        icon: DescriptionIcon,
        href: "/leave-request",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
      },
      {
        label: "Contracts",
        icon: GavelIcon,
        href: "/contracts",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "ACCOUNTANT", "HR"],
      },
    ],
  },
];
