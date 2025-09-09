package server.utils;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.models.accountant.fund.Fund;
import server.repositories.accountant.fund.FundRepository;

@Service
@RequiredArgsConstructor
public class FundGenerator {

    private final FundRepository fundRepository;

    @PostConstruct
    public void init() {
        generateBankFund();
    }

    public Fund generateBankFund() {
        final String fundName = "Bank Fund";
        return fundRepository.findByName(fundName)
                .orElseGet(() -> {
                    Fund fund = new Fund();
                    fund.setName(fundName);
                    fund.setBalance(0.0);
                    fund.setStatus("ACTIVE");
                    fund.setPurpose("Account number 65609062003 at TPBank (Tien Phong Bank)");
                    return fundRepository.save(fund);
                });
    }
}
