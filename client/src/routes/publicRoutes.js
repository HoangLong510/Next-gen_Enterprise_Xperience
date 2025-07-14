import DefaultLayout from "~/layouts/default_layout";
import NotificationsPage from "~/pages/notifaication/NotificationList";
import HomePage from "~/pages/index.jsx";
import LeaveRequest from "~/pages/leave-request";
import ProfilePage from "~/pages/profile";
import DepartmentPage from "~/pages/departments";

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
];

export default publicRoutes;
