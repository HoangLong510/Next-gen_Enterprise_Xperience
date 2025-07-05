import DefaultLayout from "~/layouts/default_layout"
import Home from "~/pages/home"
import NotificationsPage from "~/pages/notifaication"
import Profile from "~/pages/profile"
import HomePage from "~/pages/index.jsx"
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
		path: "/notifications",
		component: NotificationsPage,
		layout: DefaultLayout,
		role: "ADMIN"
  	}

]

export default publicRoutes
