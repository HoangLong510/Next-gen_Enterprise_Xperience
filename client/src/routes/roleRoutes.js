import DefaultLayout from "~/layouts/default_layout"
import AccountsManagement from "~/pages/management/accounts/index.jsx";
import Home from "~/pages/index.jsx"
import DocumentList from "~/pages/management/document/DocumentList"

const roleRoutes = [
	{
		path: "/management/accounts",
		component: AccountsManagement,
		layout: DefaultLayout,
		roles: [
			"ADMIN"
		]
	},
	{
		path: "/management/documents",
		component: DocumentList,
		layout: DefaultLayout,
		roles: [
			"ADMIN"
		]
	}
]

export default roleRoutes
