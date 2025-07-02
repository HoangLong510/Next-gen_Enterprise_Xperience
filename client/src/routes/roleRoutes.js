import DefaultLayout from "~/layouts/default_layout"
import Home from "~/pages/index.jsx"
import ListAccounts from "~/pages/management/accounts/list-accounts"

const roleRoutes = [
	{
		path: "/management/accounts",
		component: ListAccounts,
		layout: DefaultLayout,
		role: "ADMIN"
	}
]

export default roleRoutes
