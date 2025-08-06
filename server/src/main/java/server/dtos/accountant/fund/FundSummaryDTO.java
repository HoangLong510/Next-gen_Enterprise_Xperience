package server.dtos.accountant.fund;

public record FundSummaryDTO(
        long totalFunds,
        Double totalBalance,
        long totalPending,
        long transactionCount,
        Double totalIncreased,
        Double totalDecreased,
        Double previousBalance,
        Double previousTotalIncreased,
        Double previousTotalDecreased
) {}

