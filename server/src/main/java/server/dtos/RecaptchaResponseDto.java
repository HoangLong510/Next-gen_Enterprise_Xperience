package server.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RecaptchaResponseDto {
    private boolean success;
    @JsonProperty("error-codes")
    private String[] errorCodes;
}
