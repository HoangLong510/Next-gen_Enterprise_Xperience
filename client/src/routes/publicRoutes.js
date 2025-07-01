import DefaultLayout from "~/layouts/default_layout"
import Home from "~/pages/home"
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
	}
]

export default publicRoutes
