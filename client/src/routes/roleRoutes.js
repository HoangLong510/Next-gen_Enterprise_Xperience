<<<<<<< Updated upstream
<<<<<<< HEAD
=======
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> parent of c9933c3 (Revert "minh/conflixx")
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
import SalaryDetail from "~/pages/accountant/salary-detail"
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
		roles:["ADMIN","MANAGER","HOD","ACCOUNTANT"]
	},
	{
		path: "/finance/fund/:fundID",
		component: FundDetails,
		layout: DefaultLayout,
		roles: ["ADMIN","HOD","ACCOUNTANT"]
	},
	{
		path: "/finance/fund/transactions",
		component: TransactionList,
		layout: DefaultLayout,
		roles:["ADMIN","HOD","ACCOUNTANT"]
	},
	{
		path: "/finance/salary",
		component: CreateSalaryPage,
		layout: DefaultLayout,
		roles: ["ADMIN","MANAGER","HOD","ACCOUNTANT"]
	},
	{
		path: "/finance/salary/detail/:id",
		component: SalaryDetail,
		layout: DefaultLayout,
		roles: ["ADMIN","HOD","ACCOUNTANT"]
	},
	/* */
]
=======
import DefaultLayout from "~/layouts/default_layout";
import DocumentDetail from "~/pages/management/document/DocumentDetail";
import AccountsManagement from "~/pages/management/accounts/index.jsx";
import DocumentList from "~/pages/management/document/DocumentList";
import AddDepartmentPage from "~/pages/departments/add";
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees";
import EditDepartmentPage from "~/pages/departments/edit";
import CreateAccountManagementPage from "~/pages/management/accounts/create";
import ProjectManagement from "~/pages/management/project/list-project";
import ProjectDetailPage from "~/pages/management/project/ProjectDetailPage";
import ProjectKanbanBoard from "~/components/project/KanbanForm";

const roleRoutes = [
  // Accounts
  {
    path: "/management/accounts",
    component: AccountsManagement,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },
  {
    path: "/management/accounts/create",
    component: CreateAccountManagementPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },

  // Documents
  {
    path: "/management/documents",
    component: DocumentList,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },
  {
    path: "/management/documents/:id",
    component: DocumentDetail,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },
>>>>>>> Stashed changes

<<<<<<< HEAD
=======
=======
import DefaultLayout from "~/layouts/default_layout";
import DocumentDetail from "~/pages/management/document/DocumentDetail";
import AccountsManagement from "~/pages/management/accounts/index.jsx";
import DocumentList from "~/pages/management/document/DocumentList";
import AddDepartmentPage from "~/pages/departments/add";
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees";
import EditDepartmentPage from "~/pages/departments/edit";
import CreateAccountManagementPage from "~/pages/management/accounts/create";
import ProjectManagement from "~/pages/management/project/list-project";
import ProjectDetailPage from "~/pages/management/project/ProjectDetailPage";
import ProjectKanbanBoard from "~/components/project/KanbanForm";

const roleRoutes = [
  // Accounts
  {
    path: "/management/accounts",
    component: AccountsManagement,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },
  {
    path: "/management/accounts/create",
    component: CreateAccountManagementPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },

  // Documents
  {
    path: "/management/documents",
    component: DocumentList,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },
  {
    path: "/management/documents/:id",
    component: DocumentDetail,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },

>>>>>>> Stashed changes
=======
import DefaultLayout from "~/layouts/default_layout";
import DocumentDetail from "~/pages/management/document/DocumentDetail";
import AccountsManagement from "~/pages/management/accounts/index.jsx";
import DocumentList from "~/pages/management/document/DocumentList";
import AddDepartmentPage from "~/pages/departments/add";
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees";
import EditDepartmentPage from "~/pages/departments/edit";
import CreateAccountManagementPage from "~/pages/management/accounts/create";
import ProjectManagement from "~/pages/management/project/list-project";
import ProjectDetailPage from "~/pages/management/project/ProjectDetailPage";
import ProjectKanbanBoard from "~/components/project/KanbanForm";

const roleRoutes = [
  // Accounts
  {
    path: "/management/accounts",
    component: AccountsManagement,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },
  {
    path: "/management/accounts/create",
    component: CreateAccountManagementPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },

  // Documents
  {
    path: "/management/documents",
    component: DocumentList,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },
  {
    path: "/management/documents/:id",
    component: DocumentDetail,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },

>>>>>>> Stashed changes
>>>>>>> parent of c9933c3 (Revert "minh/conflixx")
  // Projects (PM/Admin/Manager)
  {
    path: "/management/projects",
    component: ProjectManagement,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },
  {
    path: "/management/projects/:id",
    component: ProjectDetailPage,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },

  // Kanban theo Project (chỉ PM/Admin/Manager). ❗ BỎ EMPLOYEE ở đây
  {
    path: "/projects/:id/kanban",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },
  // Kanban theo Phase (giữ nguyên)
  {
    path: "/projects/:projectId/phase/:phaseId/kanban",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM"],
  },

  // Departments
  {
    path: "/departments/add",
    component: AddDepartmentPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },
  {
    path: "/departments/add-employees/:id",
    component: AddEmployeeDepartmentPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },
  {
    path: "/departments/edit/:id",
    component: EditDepartmentPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },

  // ✅ Tasks (HOD & EMPLOYEE) — dùng cùng KanbanForm, có filter Project
  {
    path: "/utilities/tasks",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
    roles: ["HOD", "EMPLOYEE"],
  },
];

export default roleRoutes;
