import DefaultLayout from "~/layouts/default_layout"
import DocumentDetail from "~/pages/management/document/DocumentDetail"
import AccountsManagement from "~/pages/management/accounts/index.jsx"
import DocumentList from "~/pages/management/document/DocumentList"
import AddDepartmentPage from "~/pages/departments/add"
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees"
import EditDepartmentPage from "~/pages/departments/edit"
import CreateAccountManagementPage from "~/pages/management/accounts/create"
import FundList from "~/pages/accountant/fund-list"
import FundDetails from "~/pages/accountant/fund-detail"
import TransactionList from "~/pages/accountant/fund-transaction-list"
import CreateSalaryPage from "~/pages/accountant/salary"
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
		roles: ["ADMIN", "MANAGER", "PM","ACCOUNTANT"]
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
		roles: ["ADMIN", "MANAGER", "PM","ACCOUNTANT"]
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
	},
	//Account
	{
		path: "/finance/fund",
		component: FundList,
		layout: DefaultLayout,
		roles:["ADMIN"]
	},
	{
		path: "/finance/fund/:fundID",
		component: FundDetails,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	},
	{
		path: "/finance/fund/transactions",
		component: TransactionList,
		layout: DefaultLayout,
		roles:["ADMIN"]
	},
	{
		path: "/finance/salary/create",
		component: CreateSalaryPage,
		layout: DefaultLayout,
		roles: ["ADMIN"]
	},
	/* */
]

export default roleRoutes
