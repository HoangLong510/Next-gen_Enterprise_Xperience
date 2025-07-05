import { configureStore } from "@reduxjs/toolkit"
import popupReducer from "./features/popup/popupSlice"
import accountReducer from "./features/account/accountSlice"
import popupLogoutReducer from "./features/popupLogout/popupLogoutSlice"
import changePasswordReducer from "./features/changePassword/changePasswordSlice"

export const store = configureStore({
	reducer: {
		popup: popupReducer,
		account: accountReducer,
		popupLogout: popupLogoutReducer,
		changePassword: changePasswordReducer
	}
})
