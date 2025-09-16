/**
 * Tính phần trăm tiến độ dự án dựa trên số task đã hoàn thành
 */
const toLocalDate = (d) => {
  if (!d) return null;
  // nếu d là 'YYYY-MM-DD' giữ nguyên, else parse
  const [y, m, day] = d.toString().split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1); // 00:00 local
};
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
export function formatStatus(status) {
  if (!status) return "";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase()); // "IN_PROGRESS" -> "In Progress"
}

export const isOverdue = (deadlineStr) => {
  if (!deadlineStr) return false;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadline = toLocalDate(deadlineStr);
  return deadline < todayLocal;
};

/**
 * Tính số ngày còn lại đến hạn
 */export const calculateDaysRemaining = (deadlineStr) => {
  if (!deadlineStr) return 0;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadline = toLocalDate(deadlineStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((deadline - todayLocal) / msPerDay);
  return Math.max(0, diff); // hôm nay => 0
};

/**
 * Tính số ngày đã trễ
 */
export const getDaysOverdue = (deadlineStr) => {
  if (!deadlineStr) return 0;
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const deadline = toLocalDate(deadlineStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((todayLocal - deadline) / msPerDay);
  return Math.max(0, diff);
};

/**
 * Trả về màu chip theo status
 */export const getStatusColor = (status) => {
  switch ((status || "").toUpperCase()) {
    case "PLANNING":
      return "warning";
    case "IN_PROGRESS":
      return "info";
    case "IN_REVIEW":
      return "secondary";;
    case "COMPLETED":
      return "success";
    case "CANCELED":
      return "error";
    default:
      return "default";
  }
};

