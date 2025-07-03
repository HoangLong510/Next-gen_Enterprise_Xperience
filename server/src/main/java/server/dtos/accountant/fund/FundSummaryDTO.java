package server.dtos.accountant.fund;

public record FundSummaryDTO(
        long totalFunds,
        double totalBalance,
        long totalExpenses,
        long activeFunds,
        long lockedFunds
) {}
