import React, { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { useLocation } from "react-router-dom"
import LoadingPage from "~/components/loading-page"
import { clearAccount, setAccount } from "~/libs/features/account/accountSlice"
import { setPopup } from "~/libs/features/popup/popupSlice"
import { fetchAccountDataApi, refreshTokenApi } from "~/services/auth.service"

export default function AuthProvider({ children }) {
	const [loading, setLoading] = useState(true)
	const [ready, setReady] = useState(false)
	const dispatch = useDispatch()
	const location = useLocation()

	const handleRefreshToken = async () => {
		const refreshToken = localStorage.getItem("refreshToken")
		if (refreshToken) {
			const res = await refreshTokenApi(refreshToken)
			if (res.status !== 200) {
				localStorage.removeItem("accessToken")
				localStorage.removeItem("refreshToken")
				dispatch(clearAccount())
				dispatch(
					setPopup({
						type: "error",
						message: "invalid-access-token"
					})
				)
				setLoading(false)
			} else {
				localStorage.setItem("accessToken", res.data.accessToken)
				localStorage.setItem("refreshToken", res.data.refreshToken)
				handleFetchData()
			}
		}
	}

	const handleFetchData = async () => {
		const accessToken = localStorage.getItem("accessToken")

		if (accessToken) {
			const res = await fetchAccountDataApi(accessToken)
			if (res.status !== 200) {
				handleRefreshToken()
			} else {
				dispatch(setAccount(res.data))
			}
		}
		setLoading(false)
	}

	useEffect(() => {
		handleFetchData()
		setTimeout(() => setReady(true), 1000)
	}, [location.pathname])

	if (!ready || loading) {
		return <LoadingPage />
	}

	return <>{children}</>
}
