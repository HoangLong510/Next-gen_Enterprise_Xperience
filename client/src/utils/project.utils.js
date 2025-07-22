/**
 * Tính phần trăm tiến độ dự án dựa trên số task đã hoàn thành
 */
export const calculateProgress = (tasks) => {
	if (!tasks || tasks.length === 0) return 0
	const completed = tasks.filter((t) => t.completed).length
	return Math.round((completed / tasks.length) * 100)
}

/**
 * Format ngày ISO thành DD/MM/YYYY
 */
export const formatDate = (isoDate) => {
	const date = new Date(isoDate)
	const day = String(date.getDate()).padStart(2, "0")
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const year = date.getFullYear()
	return `${day}/${month}/${year}`
}

/**
 * Kiểm tra đã quá hạn chưa (so với hôm nay)
 */
export const isOverdue = (endDate) => {
	const today = new Date()
	const end = new Date(endDate)
	return end < today
}

/**
 * Tính số ngày còn lại đến hạn
 */
export const calculateDaysRemaining = (endDate) => {
	const today = new Date()
	const end = new Date(endDate)
	const diffTime = end.getTime() - today.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))
	return Math.max(diffDays, 0)
}

/**
 * Tính số ngày đã trễ
 */
export const getDaysOverdue = (endDate) => {
	const today = new Date()
	const end = new Date(endDate)
	const diffTime = today.getTime() - end.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24))
	return Math.max(diffDays, 0)
}

/**
 * Trả về màu chip theo status
 */export const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case "PLANNING":
      return "info";
    case "IN_PROGRESS":
      return "success";
    case "COMPLETED":
      return "primary";
    case "CANCELED":
      return "error";
    default:
      return "default";
  }
};
export const getPriorityColor = (priority) => {
  switch (priority) {
    case "HIGH":
      return "error";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "default";
    default:
      return "default";
  }
};
