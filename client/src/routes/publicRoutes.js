import DefaultLayout from "~/layouts/default_layout"
import HomePage from "~/pages/index.jsx"
import LeaveRequest from "~/pages/leave-request"
import ProfilePage from "~/pages/profile"


const publicRoutes = [
	{
		path: "/",
		component: HomePage,
		layout: DefaultLayout
	},
	{
		path: "/profile",
		component: ProfilePage,
		layout: DefaultLayout
	},
	{
		path: "/leave-request",
		component: LeaveRequest,
		layout: DefaultLayout
	}
]

export default publicRoutes
