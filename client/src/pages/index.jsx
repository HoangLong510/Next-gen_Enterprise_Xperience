import {useTranslation} from "react-i18next";
import {Helmet} from "react-helmet-async";

export default function HomePage() {
	const {t} = useTranslation("home_page")

	return (
		<>
			<Helmet>
				<title>{t("homepage")}</title>
			</Helmet>
			{/*  */}
			Home
		</>
	)
}
