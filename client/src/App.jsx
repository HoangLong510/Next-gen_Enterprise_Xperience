import { Route, Routes } from "react-router-dom"
import authRoutes from "./routes/authRoutes"
import Popup from "./components/popup"
import publicRoutes from "./routes/publicRoutes"
import AuthProvider from "./providers/AuthProvider"
import { useSelector } from "react-redux"
import roleRoutes from "./routes/roleRoutes"
import RedirectWithAction from "./components/redirect-with-action"
import PopupLogout from "./components/popup-logout"
import ChangePasswordDialog from "~/components/change-password-dialog/index.jsx";

function App() {
	const account = useSelector((state) => state.account.value)

	return (
		<AuthProvider>
			<Routes>
				{/* Public routes */}
				{publicRoutes.map((route) => {
					const Layout = route.layout
					const Page = route.component
					return (
						<Route
							key={route.path}
							path={route.path}
							element={
								account ? (
									<Layout>
										<Page />
									</Layout>
								) : (
									<RedirectWithAction to="/auth/login" />
								)
							}
						/>
					)
				})}

				{/* Auth routes */}
				{authRoutes.map((route) => {
					const Layout = route.layout
					const Page = route.component
					return (
						<Route
							key={route.path}
							path={route.path}
							element={
								!account ? (
									<Layout>
										<Page />
									</Layout>
								) : (
									<RedirectWithAction to="/" />
								)
							}
						/>
					)
				})}

				{/* Role routes */}
				{roleRoutes.map((route) => {
					const Layout = route.layout
					const Page = route.component
					return (
						<Route
							key={route.path}
							path={route.path}
							element={
								account && account.role === route.role ? (
									<Layout>
										<Page />
									</Layout>
								) : (
									<RedirectWithAction
										to="/"
										message="you-do-not-have-permission-to-access-this-feature"
									/>
								)
							}
						/>
					)
				})}

				{/* 404 */}
				<Route
					path="*"
					element={
						account ? (
							<RedirectWithAction
								to="/"
								message="the-path-you-are-trying-to-access-is-invalid"
							/>
						) : (
							<RedirectWithAction
								to="/auth/login"
								message="the-path-you-are-trying-to-access-is-invalid"
							/>
						)
					}
				/>
			</Routes>

			{/* components */}
			<Popup />
			<PopupLogout />
			<ChangePasswordDialog />
		</AuthProvider>
	)
}

export default App
