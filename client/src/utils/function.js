export const formatDate = (dateString, language) => {
	return new Date(dateString).toLocaleDateString(
		language === "vi" ? "vi-VN" : "en-US",
		{
			year: "numeric",
			month: "long",
			day: "numeric",
		})
}