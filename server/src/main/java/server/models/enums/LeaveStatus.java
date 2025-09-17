package server.models.enums;

public enum LeaveStatus {
    PENDING,        // chờ người duyệt
    PENDING_HR,     // người duyệt đã ký, chờ HR xác nhận
    APPROVED,       // HR đã xác nhận
    REJECTED,        // bị từ chối
    CANCELLED,       //bị hủy
    WAITING_TO_CANCEL, //đợi để hủy đơn
    EXPIRED //hết hạn
}
