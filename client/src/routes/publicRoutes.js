import DefaultLayout from "~/layouts/default_layout";
import NotificationsPage from "~/pages/notifaication/NotificationList";
import HomePage from "~/pages/index.jsx";
import LeaveRequest from "~/pages/leave-request";
import ProfilePage from "~/pages/profile";
import DepartmentPage from "~/pages/departments";
import ContractList from "~/pages/contracts";
import FaceCameraVerify from "~/pages/attendance/FaceCameraVerify";
import MissingCheckOutList from "~/pages/attendance/MissingCheckOutList";
import AttendanceList from "~/pages/attendance/AttendanceList";
import AttendanceDetail from "~/pages/attendance/AttendanceDetail";
import BankAndTopupPage from "~/pages/bank/BankAndTopupPage";
// Projects
import ProjectManagement from "~/pages/management/project/list-project";
import ProjectDetailPage from "~/pages/management/project/ProjectDetailPage";
import ProjectKanbanBoard from "~/components/project/KanbanForm";
import CashAdvanceList from "~/pages/accountant/CashAdvanceList";


const publicRoutes = [
  {
    path: "/",
    component: HomePage,
    layout: DefaultLayout,
  },
  {
    path: "/profile",
    component: ProfilePage,
    layout: DefaultLayout,
  },
  {
    path: "/leave-request",
    component: LeaveRequest,
    layout: DefaultLayout,
  },
  {
    path: "/notifications",
    component: NotificationsPage,
    layout: DefaultLayout,
  },
  {
    path: "/departments",
    component: DepartmentPage,
    layout: DefaultLayout,
  },
  {
    path: "/contracts",
    component: ContractList,
    layout: DefaultLayout,
  },
  {
    path: "/attendance",
    component: FaceCameraVerify,
    layout: DefaultLayout,
  },
  {
    path: "/attendance/missing-checkout",
    component: MissingCheckOutList,
    layout: DefaultLayout,
  },
  {
    path: "/attendance/list",
    component: AttendanceList,
    layout: DefaultLayout,
  },
  {
    path: "/attendance/:id",
    component: AttendanceDetail,
    layout: DefaultLayout,
  },
  {
    path: "/payment",
    component: BankAndTopupPage,
    layout: DefaultLayout,
  },
   {
    path: "/payment-request",
    component: CashAdvanceList,
    layout: DefaultLayout,
  },
  // Projects
  {
    path: "/management/projects",
    component: ProjectManagement,
    layout: DefaultLayout,
  },
  {
    path: "/management/projects/:id",
    component: ProjectDetailPage,
    layout: DefaultLayout,
  },

  // Kanban (Project & Phase)
  {
    path: "/projects/:id/kanban",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
  },
  {
    path: "/projects/:projectId/phase/:phaseId/kanban",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
  },
  // Tasks
  {
    path: "/utilities/tasks",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
  },
];

export default publicRoutes;
