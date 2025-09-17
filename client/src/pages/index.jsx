import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

export default function HomePage() {
  const { t } = useTranslation("home_page")

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <title>{t("homepage")}</title>

      <Typography
        variant="h3"
        fontWeight="bold"
        color="primary"
        gutterBottom
      >
        Next-Gen Enterprise Experience
      </Typography>

      <Typography
        variant="h6"
        color="text.secondary"
        sx={{ maxWidth: 600, lineHeight: 1.6 }}
      >
        Welcome to your all-in-one platform for smart enterprise
        management.
      </Typography>
    </Box>
  )
}
