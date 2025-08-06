import DefaultLayout from "~/layouts/default_layout";
import NotificationsPage from "~/pages/notifaication/NotificationList";
import HomePage from "~/pages/index.jsx";
import LeaveRequest from "~/pages/leave-request";
import ProfilePage from "~/pages/profile";
import DepartmentPage from "~/pages/departments";
import ContractsPage from "~/pages/contracts";
import FaceCameraVerify from "~/pages/attendance/FaceCameraVerify";
import MissingCheckOutList from "~/pages/attendance/MissingCheckOutList";
import MissingCheckOutReview from "~/pages/attendance/MissingCheckOutReview";
import AttendanceList from "~/pages/attendance/AttendanceList";
import AttendanceDetail from "~/pages/attendance/AttendanceDetail";

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
    component: ContractsPage,
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
    path: "/attendance/missing-checkout-review",
    component: MissingCheckOutReview,
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
];

export default publicRoutes;
