import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import Diversity1Icon from "@mui/icons-material/Diversity1";
import SettingsIcon from "@mui/icons-material/Settings";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import DescriptionIcon from "@mui/icons-material/Description";
import WorkIcon from "@mui/icons-material/Work";
import PunchClockIcon from "@mui/icons-material/PunchClock";
import GavelIcon from "@mui/icons-material/Gavel"; // thêm cho Contracts
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";

export const menuItems = [
  {
    title: "Management",
    items: [
      {
        label: "Finance",
        icon: AttachMoneyIcon,
        href: "/management/finance",

        roles: ["ADMIN", "MANAGER", "CHIEFACCOUNTANT" ,"ACCOUNTANT", "SECRETARY"],

      },
      {
        label: "Accounts",
        icon: ManageAccountsIcon,
        href: "/management/accounts",
        roles: ["ADMIN", "SECRETARY"],
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
        href: "/employees",
        roles: ["ADMIN", "MANAGER", "HR", "SECRETARY"],
      },
      {
        label: "Contracts",
        icon: FilePresentIcon,
        href: "/contracts",

        roles: ["ADMIN", "MANAGER", "SECRETARY"],
      },
      {
        label: "Attendance",
        icon: PunchClockIcon,
        href: "/attendance/list",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE", "HR", "SECRETARY"],
      },
      {
        label: "Missing Checkout",
        icon: HighlightOffIcon,
        href: "/attendance/missing-checkout",
        roles: ["HR"],
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

        roles: ["ADMIN", "MANAGER", "HOD", "CHIEFACCOUNTANT" ,"ACCOUNTANT"],

      },
      {
        label: "Salary",
        icon: FilePresentIcon,
        href: "/finance/salary",
        roles: ["ADMIN", "MANAGER", "SECRETARY", "CHIEFACCOUNTANT" ,"ACCOUNTANT"],

      },
      {
        label: "Cash Advance",
        icon: FilePresentIcon,
        href: "/payment-request",
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "HR",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "SECRETARY",
        ],
      },
      {
        label: "Payment",
        icon: FilePresentIcon,
        href: "/payment",
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "HR",
          "ACCOUNTANT",
          "CHIEFACCOUNTANT",
          "SECRETARY",
        ],
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
        roles: ["ADMIN", "MANAGER", "HOD", "EMPLOYEE", "SECRETARY"],
      },
      {
        // Mở cho tất cả để HOD/EMPLOYEE đi theo đường Projects
        label: "Projects",
        icon: AccountTreeIcon,
        href: "/management/projects",
        roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
      },
      {
        label: "Dispatches",
        label: "Dispatches", // = Documents
        icon: AssignmentIcon,
        href: "/management/documents",
        roles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT", "SECRETARY"],
      },
      // ⛔ ĐÃ BỎ "Tasks" KHỎI MENU NHƯ YÊU CẦU
      {
        label: "Leave Request",
        icon: DescriptionIcon,
        href: "/leave-request",
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "HR",
          "ACCOUNTANT",
          "SECRETARY",
          "CHIEFACCOUNTANT",
        ],
      },
      {
        label: "Contracts",
        icon: GavelIcon,
        href: "/contracts",
        roles: [
          "ADMIN",
          "MANAGER",
          "PM",
          "HOD",
          "EMPLOYEE",
          "ACCOUNTANT",
          "HR",
          "SECRETARY",
          "CHIEFACCOUNTANT",
        ],
      },
    ],
  },
];
