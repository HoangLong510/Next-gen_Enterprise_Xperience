import DefaultLayout from "~/layouts/default_layout"
import ListAccounts from "~/pages/management/accounts/list-accounts"
import DocumentDetail from "~/pages/management/document/DocumentDetail"
import DocumentList from "~/pages/management/document/DocumentList"

const roleRoutes = [
	{
		path: "/management/accounts",
		component: ListAccounts,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	},
	{
		path: "/management/documents",
		component: DocumentList,
		layout: DefaultLayout,
		roles: ["ADMIN", "MANAGER", "PM"]
	},
	{
        path: "/management/documents/:id",
        component: DocumentDetail,
        layout: DefaultLayout,
        roles: ["ADMIN", "MANAGER", "PM"]
    },
]

export default roleRoutes
