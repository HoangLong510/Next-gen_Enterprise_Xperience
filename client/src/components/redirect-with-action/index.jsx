import React from "react"
import { useDispatch } from "react-redux"
import { Navigate } from "react-router-dom"
import { setPopup } from "~/libs/features/popup/popupSlice"
import LoadingPage from "../loading-page"

export default function RedirectWithAction({ to, message }) {
	const dispatch = useDispatch()
	const [ready, setReady] = React.useState(false)

	React.useEffect(() => {
		const timer = setTimeout(() => {
			if (message) {
				dispatch(
					setPopup({
						type: "error",
						message
					})
				)
			}
			setReady(true)
		}, 1000)

		return () => clearTimeout(timer)
	}, [dispatch, message])

	return ready ? <Navigate to={to} replace /> : <LoadingPage />
}
