import DefaultLayout from "~/layouts/default_layout";

// Accounts
import AccountsManagement from "~/pages/management/accounts/index.jsx";
import AccountManagementDetails from "~/pages/management/accounts/details";

// Documents (Dispatches)
import DocumentList from "~/pages/management/document/DocumentList";
import DocumentDetail from "~/pages/management/document/DocumentDetail";
import DocumentUpdate from "~/pages/management/document/DocumentUpdate";
import DocumentHistoryList from "~/pages/management/document/DocumentHistoryList";



// Departments
import AddDepartmentPage from "~/pages/departments/add";
import AddEmployeeDepartmentPage from "~/pages/departments/add-employees";
import EditDepartmentPage from "~/pages/departments/edit";

// Finance/Accounting
import FundList from "~/pages/accountant/fund-list";
import FundDetails from "~/pages/accountant/fund-detail";
import TransactionList from "~/pages/accountant/fund-transaction-list";
import CreateSalaryPage from "~/pages/accountant/salary";
import SalaryDetail from "~/pages/accountant/salary-detail";

// Employees
import EmployeesListPage from "~/pages/employees";
import CreateEmployeePage from "~/pages/employees/create";
import EmployeeDetailsPage from "~/pages/employees/details";
import EmployeeExcelImport from "~/pages/employees/excel_import";
import CashAdvanceList from "~/pages/accountant/CashAdvanceList";

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
    path: "/management/accounts/details/:id",
    component: AccountManagementDetails,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },

  // Documents
  {
    path: "/management/documents",
    component: DocumentList,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT"],
  },
  {
    path: "/management/documents/:id",
    component: DocumentDetail,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM", "ACCOUNTANT"],
  },


  // Projects — mở cho tất cả vai trò liên quan (ADMIN/MANAGER/PM/HOD/EMPLOYEE)
  {
    path: "/management/documents/:id/update",
    component: DocumentUpdate,
    layout: DefaultLayout,

    roles: ["ADMIN"],
  },
  {
    path: "/management/documents/:id/histories",
    component: DocumentHistoryList,
    layout: DefaultLayout,
    roles: ["MANAGER", "ADMIN"],
  },

  // Kanban (Project & Phase) — mở cho HOD/EMPLOYEE để họ xem/drag theo rule
  {
    path: "/projects/:id/kanban",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
  },
  {
    path: "/projects/:projectId/phase/:phaseId/kanban",
    component: ProjectKanbanBoard,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "PM", "HOD", "EMPLOYEE"],
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

  // Finance
  {
    path: "/finance/fund",
    component: FundList,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "HOD", "ACCOUNTANT"],
  },
  {
    path: "/finance/fund/:fundID",
    component: FundDetails,
    layout: DefaultLayout,
    roles: ["ADMIN", "HOD", "ACCOUNTANT"],
  },
  {
    path: "/finance/fund/transactions",
    component: TransactionList,
    layout: DefaultLayout,
    roles: ["ADMIN", "HOD", "ACCOUNTANT"],
  },
  {
    path: "/finance/salary",
    component: CreateSalaryPage,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "HOD", "ACCOUNTANT"],
  },
  {
    path: "/finance/salary/detail/:id",
    component: SalaryDetail,
    layout: DefaultLayout,
    roles: ["ADMIN", "HOD", "ACCOUNTANT"],
  },
  {
    path: "/finance/salary/create",
    component: CreateSalaryPage,
    layout: DefaultLayout,
    roles: ["ADMIN"],
  },
 

  // Employees
  {
    path: "/employees",
    component: EmployeesListPage,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "HR"],
  },
  {
    path: "/employees/create",
    component: CreateEmployeePage,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "HR"],
  },
  {
    path: "/employees/edit/:id",
    component: EmployeeDetailsPage,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "HR"],
  },
  {
    path: "/employees/excel-import",
    component: EmployeeExcelImport,
    layout: DefaultLayout,
    roles: ["ADMIN", "MANAGER", "HR"],
  },
];

export default roleRoutes;
