import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PersonIcon from "@mui/icons-material/Person";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import GroupIcon from "@mui/icons-material/Group";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

export const ROLE_CONFIGS = [
  {
    value: "ADMIN",
    color: "error",
    icon: AdminPanelSettingsIcon,
  },
  {
    value: "MANAGER",
    color: "warning",
    icon: EmojiEventsIcon,
  },
  {
    value: "PM",
    color: "info",
    icon: AccountTreeIcon,
  },
  {
    value: "CHIEFACCOUNTANT",
    color: "success",
    icon: WorkspacePremiumIcon,
  },
  {
    value: "ACCOUNTANT",
    color: "success",
    icon: TrendingUpIcon,
  },
  {
    value: "HOD",
    color: "secondary",
    icon: SupervisorAccountIcon,
  },
  {
    value: "HR",
    color: "primary",
    icon: GroupIcon,
  },
  {
    value: "EMPLOYEE",
    color: "primary",
    icon: PersonIcon,
  },
  {
    value: "SECRETARY",
    color: "primary",
    icon: AssignmentIndIcon,
  },
];

export function getRoleConfig(roleValue) {
  return ROLE_CONFIGS.find((role) => role.value === roleValue) || {};
}
