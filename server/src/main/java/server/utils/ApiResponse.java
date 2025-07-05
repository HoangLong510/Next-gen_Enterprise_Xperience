package server.utils;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;

import java.util.HashMap;
import java.util.Map;

@Data
@AllArgsConstructor
public class ApiResponse<T> {
    private T data;
    private String message;
    private int status;
    private Map<String, String> errors;

    public ApiResponse(T data, String message, int status) {
        this.data = data;
        this.message = message;
        this.status = status;
    }

    //success
    public static <T> ApiResponse<T>
    success(T data, String message) {
        return new ApiResponse<>
                (data, message, 200);
    }

    //created
    public static <T> ApiResponse<T>
    created(T data, String message) {
        return new ApiResponse<>
                (data, message, 201);
    }

    //not found
    public static <T> ApiResponse<T>
    notfound(String message) {
        return new ApiResponse<>
                (null, message, 404, null);
    }

    //badRequest
    public static <T> ApiResponse<T>
    badRequest(BindingResult bindingResult) {
        Map<String, String> errors = new HashMap<>();

        for (FieldError error : bindingResult.getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }

        return new ApiResponse<>
                (null, "validation-errors", 400, errors);
    }

    public static <T> ApiResponse<T> badRequest(String message) {
        return new ApiResponse<>(null, message, 400, null);
    }

    //unAuthorized
    public static <T> ApiResponse<T> unauthorized() {
        return new ApiResponse<>(null, "unauthorized", 401, null);
    }

    //error server
    public static <T> ApiResponse<T>
    errorServer(String message) {
        return new ApiResponse<>(null, message,
                500, null);
    }
}
