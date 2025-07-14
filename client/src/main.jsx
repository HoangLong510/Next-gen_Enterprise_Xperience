
import { createRoot } from "react-dom/client"
import { BrowserRouter as Router } from "react-router-dom"
import { Provider } from "react-redux"
import { store } from "./libs/store.js"
import { CssBaseline, ThemeProvider } from "@mui/material"
import theme from "./styles/theme.js"
import App from "./App.jsx"
import "./i18n"
import "./styles/index.css"
import { SnackbarProvider } from "notistack";

createRoot(document.getElementById("root")).render(
	<Provider store={store}>
		<Router>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<SnackbarProvider
            maxSnack={3}
            autoHideDuration={4000}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <App />
          </SnackbarProvider>
			</ThemeProvider>
		</Router>
	</Provider>
)

