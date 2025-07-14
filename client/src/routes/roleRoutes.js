import DefaultLayout from "~/layouts/default_layout"
import DocumentDetail from "~/pages/management/document/DocumentDetail"
import AccountsManagement from "~/pages/management/accounts/index.jsx"
import DocumentList from "~/pages/management/document/DocumentList"
import AddDepartmentPage from "~/pages/departments/add"
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees"
const roleRoutes = [
	{
		path: "/management/accounts",
		component: AccountsManagement,
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
	{
		path: "/departments/add",
		component: AddDepartmentPage,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	},
	{
		path: "/departments/add-employees/:id",
		component: AddEmployeeDepartmentPage,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	}
]

export default roleRoutes
