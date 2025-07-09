import { useTranslation } from "react-i18next"

export default function HomePage() {
	const { t } = useTranslation("home_page")

	return (
		<>
			<title>{t("homepage")}</title>
			{/*  */}
			Home
		</>
	)
}
