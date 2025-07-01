import NoLayout from "~/layouts/no-layout"
import Login from "~/pages/auth/login"

const authRoutes = [
	{
		path: "/auth/login",
		component: Login,
		layout: NoLayout
	}
]

export default authRoutes
