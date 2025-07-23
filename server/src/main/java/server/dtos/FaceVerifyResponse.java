package server.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class FaceVerifyResponse {
    private boolean match;

    @JsonProperty("location_ok")
    private boolean location_ok;

    @JsonProperty("distance_km")
    private double distance_km;
}