package server.services.bank;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;        // 👈 thêm
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.models.bank.BankTransaction;
import server.models.enums.bank.BankTxType;
import server.repositories.bank.BankTransactionRepository;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankWebhookService {
    private final BankTransactionRepository repo;
    private final TopupService topupService;
    private final BankFundSyncService bankFundSyncService;
    private final ObjectMapper om = new ObjectMapper();

    @Transactional
    public void upsertFromWebhook(String rawJson) throws Exception {
        JsonNode n = om.readTree(rawJson);

        String sepayId         = n.path("id").asText();
        String gateway         = n.path("gateway").asText("");
        String transactionDate = n.path("transactionDate").asText("");
        String accountNumber   = n.path("accountNumber").asText("");
        String content         = n.path("content").asText("");
        String transferType    = n.path("transferType").asText("in");
        long transferAmount    = n.path("transferAmount").asLong(0);
        long accumulated       = n.path("accumulated").asLong(0);
        String referenceCode   = n.path("referenceCode").asText("");
        String descriptionAll  = n.path("description").asText("");
        String detectedCode    = n.path("code").asText("");

        LocalDateTime txTime = parseBankTime(transactionDate);
        BankTxType type = "out".equalsIgnoreCase(transferType) ? BankTxType.DEBIT : BankTxType.CREDIT;
        String refId = (sepayId != null && !sepayId.isBlank()) ? sepayId : referenceCode;

        if (refId == null || refId.isBlank()) {
            log.warn("[BankWebhook] Missing refId (sepayId/referenceCode empty). Skip. acc={}, time={}, amount={}",
                    accountNumber, transactionDate, transferAmount);
            return;
        }

        BankTransaction tx = repo.findByRefId(refId).orElseGet(BankTransaction::new);
        tx.setRefId(refId);
        tx.setAccountNo(accountNumber);
        tx.setCounterAccountNo(null);
        tx.setCounterName(null);
        tx.setType(type);
        tx.setAmount(transferAmount);
        tx.setBalance(accumulated);
        tx.setDescription((content == null || content.isBlank()) ? descriptionAll : content);
        tx.setTxTime(txTime);
        tx.setRaw(rawJson);
        repo.save(tx);

        var latest = repo.findTopByOrderByTxTimeDesc().orElse(null);
        if (latest != null && Objects.equals(latest.getId(), tx.getId())) {
            bankFundSyncService.syncFromBankTx(tx);
        }

        topupService.matchTopupUsing(tx, detectedCode);
    }

    private static final DateTimeFormatter[] BANK_FORMATS = new DateTimeFormatter[]{
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("HH:mm:ss dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss")
    };

    private LocalDateTime parseBankTime(String s) {
        if (s == null || s.isBlank()) {
            log.warn("[BankWebhook] transactionDate empty -> fallback now()");
            return LocalDateTime.now();
        }
        for (DateTimeFormatter f : BANK_FORMATS) {
            try { return LocalDateTime.parse(s, f); }
            catch (Exception ignore) {}
        }
        log.warn("[BankWebhook] Cannot parse transactionDate='{}' with known formats -> fallback now()", s);
        return LocalDateTime.now();
    }
}
