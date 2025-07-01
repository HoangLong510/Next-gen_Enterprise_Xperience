import { createSlice } from "@reduxjs/toolkit"

const initialState = {
	value: false
}

export const popupLogoutSlice = createSlice({
	name: "popupLogout",
	initialState,
	reducers: {
		setPopupLogout: (state) => {
			state.value = true
		},
		closePopupLogout: (state) => {
			state.value = false
		}
	}
})

export const { setPopupLogout, closePopupLogout } = popupLogoutSlice.actions

export default popupLogoutSlice.reducer
