import DefaultLayout from "~/layouts/default_layout"
import Home from "~/pages/home"
import NotificationsPage from "~/pages/notifaication"
import Profile from "~/pages/profile"

const publicRoutes = [
	{
		path: "/",
		component: Home,
		layout: DefaultLayout
	},
	{
		path: "/profile",
		component: Profile,
		layout: DefaultLayout
	},
	{
		path: "/notifications",
		component: NotificationsPage,
		layout: DefaultLayout,
		role: "ADMIN"
  	}

]

export default publicRoutes
