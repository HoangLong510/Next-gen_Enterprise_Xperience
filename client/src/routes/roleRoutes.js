import DefaultLayout from "~/layouts/default_layout"
import DocumentDetail from "~/pages/management/document/DocumentDetail"
import AccountsManagement from "~/pages/management/accounts/index.jsx"
import DocumentList from "~/pages/management/document/DocumentList"
import AddDepartmentPage from "~/pages/departments/add"
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees"
import EditDepartmentPage from "~/pages/departments/edit"
import CreateAccountManagementPage from "~/pages/management/accounts/create"
import ProjectManagement from "~/pages/management/project/list-project"
import ProjectDetailPage from "~/pages/management/project/ProjectDetailPage"
const roleRoutes = [
	{
		path: "/management/accounts",
		component: AccountsManagement,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	},
	{
		path: "/management/accounts/create",
		component: CreateAccountManagementPage,
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
		path: "/management/projects",
		component: ProjectManagement,
		layout: DefaultLayout,
		roles: ["ADMIN", "MANAGER", "PM"]
	},
	{
		path: "/management/projects/:id",
		component: ProjectDetailPage,
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
	},
	{
		path: "/departments/edit/:id",
		component: EditDepartmentPage,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	}
]

export default roleRoutes
