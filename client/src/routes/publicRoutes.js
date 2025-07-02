import DefaultLayout from "~/layouts/default_layout"
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
	}
]

export default publicRoutes
