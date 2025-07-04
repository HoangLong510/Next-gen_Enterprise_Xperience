import { createSlice } from "@reduxjs/toolkit"

const initialState = {
	value: false
}

export const changePasswordSlice = createSlice({
	name: "changePassword",
	initialState,
	reducers: {
		setChangePassword: (state) => {
			state.value = true
		},
		closeChangePassword: (state) => {
			state.value = false
		}
	}
})

export const { setChangePassword, closeChangePassword } = changePasswordSlice.actions

export default changePasswordSlice.reducer
