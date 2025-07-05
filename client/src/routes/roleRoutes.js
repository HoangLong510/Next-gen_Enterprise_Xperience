import DefaultLayout from "~/layouts/default_layout"
import Home from "~/pages/home"
import ListAccounts from "~/pages/management/accounts/list-accounts"
import DocumentList from "~/pages/management/document/DocumentList"

const roleRoutes = [
	{
		path: "/management/accounts",
		component: ListAccounts,
		layout: DefaultLayout,
		role: "ADMIN"
	},
	{
		path: "/management/documents",
		component: DocumentList,
		layout: DefaultLayout,
		role: "ADMIN"
	}
]

export default roleRoutes
