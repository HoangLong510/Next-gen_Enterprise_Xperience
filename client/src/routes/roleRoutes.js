import DefaultLayout from "~/layouts/default_layout"
import AccountsManagement from "~/pages/management/accounts/index.jsx";

const roleRoutes = [
	{
		path: "/management/accounts",
		component: AccountsManagement,
		layout: DefaultLayout,
		roles: [
			"ADMIN"
		]
	}
]

export default roleRoutes
