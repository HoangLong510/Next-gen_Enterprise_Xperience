import { createSlice } from "@reduxjs/toolkit"

const initialState = {
	value: null
}

export const accountSlice = createSlice({
	name: "account",
	initialState,
	reducers: {
		setAccount: (state, action) => {
			state.value = action.payload
		},
		clearAccount: (state) => {
			state.value = null
		}
	}
})

export const { setAccount, clearAccount } = accountSlice.actions

export default accountSlice.reducer
