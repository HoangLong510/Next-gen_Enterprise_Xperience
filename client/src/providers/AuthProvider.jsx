import React, { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { useLocation } from "react-router-dom"
import LoadingPage from "~/components/loading-page"
import { setAccount } from "~/libs/features/account/accountSlice"
import { fetchAccountDataApi } from "~/services/auth.service"

export default function AuthProvider({ children }) {
	const [loading, setLoading] = useState(true)
	const [ready, setReady] = useState(false)
	const dispatch = useDispatch()
	const location = useLocation()

	const handleFetchData = async () => {
		const accessToken = localStorage.getItem("accessToken")

		if (accessToken) {
			const res = await fetchAccountDataApi(accessToken)
			if (res.status === 200) {
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
