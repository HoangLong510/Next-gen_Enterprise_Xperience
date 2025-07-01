import { createSlice } from "@reduxjs/toolkit"

const initialState = {
	value: {
		open: false,
		data: {
			type: null,
			message: ""
		}
	}
}

export const popupSlice = createSlice({
	name: "popup",
	initialState,
	reducers: {
		setPopup: (state, action) => {
			state.value = {
				open: true,
				data: action.payload
			}
		},
		closePopup: (state) => {
			state.value.open = false
		}
	}
})

export const { setPopup, closePopup } = popupSlice.actions

export default popupSlice.reducer
