export const formatDate = (dateString, language) => {
	return new Date(dateString).toLocaleDateString(
		language === "vi" ? "vi-VN" : "en-US",
		{
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	)
}

export const formatLongDate = (dateString, language) => {
	const locale = language === "vi" ? "vi-VN" : "en-US"
	const date = new Date(dateString)

	const dmy = date.toLocaleDateString(locale, {
		year: "numeric",
		month: "long",
		day: "2-digit"
	})

	const hms = date.toLocaleTimeString(locale, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	})

	return `${hms} - ${dmy}`
}

export const getTimeAgo = (dateString, language = "vi") => {
	const now = new Date()
	const past = new Date(dateString)
	const diffMs = now - past

	const seconds = Math.floor(diffMs / 1000)
	const minutes = Math.floor(diffMs / (1000 * 60))
	const hours = Math.floor(diffMs / (1000 * 60 * 60))
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
	const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
	const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365))

	const lang = language === "vi" ? "vi" : "en"

	if (seconds < 60) {
		return lang === "vi"
			? `${seconds} giây trước`
			: `${seconds} seconds ago`
	} else if (minutes < 60) {
		return lang === "vi"
			? `${minutes} phút trước`
			: `${minutes} minutes ago`
	} else if (hours < 24) {
		return lang === "vi" ? `${hours} giờ trước` : `${hours} hours ago`
	} else if (days < 30) {
		return lang === "vi" ? `${days} ngày trước` : `${days} days ago`
	} else if (months < 12) {
		return lang === "vi" ? `${months} tháng trước` : `${months} months ago`
	} else {
		return lang === "vi" ? `${years} năm trước` : `${years} years ago`
	}
}

export const formatDateToYYYYMMDD = (date) => {
	if (date instanceof Date) {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, "0")
		const day = String(date.getDate()).padStart(2, "0")
		return `${year}-${month}-${day}`
	}
	return date
}
