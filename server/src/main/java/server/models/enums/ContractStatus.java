package server.models.enums;

public enum ContractStatus {
    PENDING,               // Chờ ký
    SIGNED_BY_MANAGER,     // Đã ký bởi Manager
    ACTIVE,                // Hợp đồng có hiệu lực (đủ 2 chữ ký: Manager + Employee)
    EXPIRED,               // Hết hạn
    DRAFT,
}
