import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import HttpBackend from "i18next-http-backend"

i18n
	// sử dụng backend để tải ngôn ngữ từ file JSON
	.use(HttpBackend)
	// tự động phát hiện ngôn ngữ trình duyệt
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		// ngôn ngữ mặc định
		fallbackLng: "en",ns: ["popup", "messages"],  
    	defaultNS: "popup", 

		detection: {
			order: ["localStorage", "navigator"],
			caches: ["localStorage"],
			lookupLocalStorage: "lng"
		},
		backend: {
			loadPath: "/locales/{{lng}}/{{ns}}.json" // đường dẫn file JSON
		},
		interpolation: {
			escapeValue: false
		}
	})

export default i18n
