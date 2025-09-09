// server/models/bank/TopupMapper.java
package server.models.bank;

import server.dtos.bank.TopupItemDTO;

public class TopupMapper {
    public static TopupItemDTO toDto(Topup t) {
        if (t == null) return null;

        TopupItemDTO.OwnerDTO ownerDto = null;
        if (t.getOwner() != null && t.getOwner().getEmployee() != null) {
            var e = t.getOwner().getEmployee();
            ownerDto = TopupItemDTO.OwnerDTO.builder()
                    .accountId(t.getOwner().getId())
                    .employeeId(e.getId())
                    .firstName(e.getFirstName())
                    .lastName(e.getLastName())
                    .email(e.getEmail())
                    .phone(e.getPhone())
                    .avatar(e.getAvatar())
                    .build();
        } else if (t.getOwner() != null) {
            ownerDto = TopupItemDTO.OwnerDTO.builder()
                    .accountId(t.getOwner().getId())
                    .build();
        }

        return TopupItemDTO.builder()
                .id(t.getId())
                .code(t.getCode())
                .amount(t.getAmount())
                .bankAccountNo(t.getBankAccountNo())
                .status(t.getStatus() != null ? t.getStatus().name() : null)
                .sepayRefId(t.getSepayRefId())
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .owner(ownerDto)
                .build();
    }
}
