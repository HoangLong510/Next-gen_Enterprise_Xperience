import { createTheme } from "@mui/material/styles"
import { red } from "@mui/material/colors"

// Create a theme instance.
const theme = createTheme({
	cssVariables: true,
	palette: {
		primary: {
			main: "#118D57"
		},
		error: {
			main: red.A400
		}
	}
})

export default theme
