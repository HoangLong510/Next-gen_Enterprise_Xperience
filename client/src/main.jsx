import {createRoot} from "react-dom/client"
import {BrowserRouter as Router} from "react-router-dom"
import {HelmetProvider} from "react-helmet-async";
import {Provider} from "react-redux"
import {store} from "./libs/store.js"
import {CssBaseline, ThemeProvider} from "@mui/material"
import theme from "./styles/theme.js"
import App from "./App.jsx"
import "./i18n"
import "./styles/index.css"

createRoot(document.getElementById("root")).render(
    <HelmetProvider>
        <Provider store={store}>
            <Router>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
                    <App/>
                </ThemeProvider>
            </Router>
        </Provider>
    </HelmetProvider>
)
