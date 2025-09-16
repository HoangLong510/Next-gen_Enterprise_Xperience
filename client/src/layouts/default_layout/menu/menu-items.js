import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import Diversity1Icon from "@mui/icons-material/Diversity1";
import SettingsIcon from "@mui/icons-material/Settings";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import DescriptionIcon from "@mui/icons-material/Description";
<<<<<<< Updated upstream
import WorkIcon from "@mui/icons-material/Work";
import PunchClockIcon from "@mui/icons-material/PunchClock";
import GavelIcon from "@mui/icons-material/Gavel"; // thêm cho Contracts
=======
import GavelIcon from "@mui/icons-material/Gavel";
import { PunchClock } from "@mui/icons-material";
>>>>>>> Stashed changes

export const menuItems = [
  {
    title: "Management",
    items: [
      {
<<<<<<< Updated upstream
        label: "Finance",
        icon: AttachMoneyIcon,
        href: "/management/finance",
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
=======
>>>>>>> Stashed changes
        label: "Accounts",
        icon: ManageAccountsIcon,
        href: "/management/accounts",
        roles: ["ADMIN"],
      },
      {
        label: "Settings",
        icon: SettingsIcon,
        href: "/management/settings",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    title: "Employees",
    items: [
      {
        label: "Employees List",
        icon: AssignmentIndIcon,
<<<<<<< Updated upstream
        href: "/employees",
        roles: ["ADMIN", "MANAGER", "HR"],
=======
        href: "/employees/profiles",
        roles: ["ADMIN", "MANAGER"],
>>>>>>> Stashed changes
      },
      {
        label: "Contracts",
        icon: FilePresentIcon,
<<<<<<< Updated upstream
        href: "/contracts",
=======
        href: "/employees/contracts",
>>>>>>> Stashed changes
        roles: ["ADMIN", "MANAGER"],
      },
      {
        label: "Attendance",
<<<<<<< Updated upstream
        icon: PunchClockIcon,
        href: "/attendance/list",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "HR"],
=======
        icon: PunchClock,
        href: "/attendance/list",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
>>>>>>> Stashed changes
      },
    ],
  },
  {
    title: "Accountant",
    items: [
      {
        label: "Fund",
        icon: AssignmentIndIcon,
        href: "/finance/fund",
        roles: ["ADMIN", "MANAGER", "HOD", "ACCOUNTANT"],
      },
      {
        label: "Salary",
        icon: FilePresentIcon,
        href: "/finance/salary",
<<<<<<< Updated upstream
        roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
      {
        label: "Cash Advance",
        icon: FilePresentIcon,
        href: "/payment-request",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "HR", "ACCOUNTANT", "CHIEFACCOUNTANT"],
      },
      {
        label: "Payment",
        icon: FilePresentIcon,
        href: "/payment",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "HR", "ACCOUNTANT", "CHIEFACCOUNTANT"],
=======
        roles: ["ADMIN", "MANAGER", "HOD", "ACCOUNTANT"],
>>>>>>> Stashed changes
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
        // Mở cho tất cả để HOD/EMPLOYEE đi theo đường Projects
        label: "Projects",
<<<<<<< Updated upstream
        icon: WorkIcon,
        href: "/management/projects",
        roles: ["ADMIN", "MANAGER", "PM"],
=======
        icon: AccountTreeIcon,
        href: "/management/projects",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
>>>>>>> Stashed changes
      },
      {
        label: "Dispatches", // = Documents
        icon: AssignmentIcon,
        href: "/management/documents",
        roles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT"],
<<<<<<< Updated upstream
      },
      {
        label: "Tasks",
        icon: TaskAltIcon,
        href: "/utilities/tasks",
        roles: ["ADMIN", "MANAGER", "PM", "CHIEFACCOUNTANT", "ACCOUNTANT", "HOD", "EMPLOYEE"],
=======
>>>>>>> Stashed changes
      },
      // ⛔ ĐÃ BỎ "Tasks" KHỎI MENU NHƯ YÊU CẦU
      {
        label: "Leave Request",
        icon: DescriptionIcon,
        href: "/leave-request",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "HR", "ACCOUNTANT", "SECRETARY", "CHIEFACCOUNTANT"],
      },
      {
        label: "Contracts",
        icon: GavelIcon,
        href: "/contracts",
<<<<<<< Updated upstream
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "ACCOUNTANT", "HR", "SECRETARY", "CHIEFACCOUNTANT"],
=======
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "ACCOUNTANT",
          "HR",
        ],
>>>>>>> Stashed changes
      },
    ],
  },
];
