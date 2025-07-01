import { configureStore } from "@reduxjs/toolkit"
import popupReducer from "./features/popup/popupSlice"
import accountReducer from "./features/account/accountSlice"
import popupLogoutReducer from "./features/popupLogout/popupLogoutSlice"

export const store = configureStore({
	reducer: {
		popup: popupReducer,
		account: accountReducer,
		popupLogout: popupLogoutReducer
	}
})
