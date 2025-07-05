package server.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CreateEmployeeDto;
import server.services.EmployeeService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
public class EmployeeController {
    private final EmployeeService employeeService;

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/create")
    public ResponseEntity<?> create(@Valid @RequestBody CreateEmployeeDto request, BindingResult result) {
        try {
            ApiResponse<?> response = employeeService.create(request, result);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PostMapping("/change-avatar")
    public ResponseEntity<?> changeAvatar(@RequestHeader("Authorization") String token, @RequestParam("file") MultipartFile file) {
        try{
            ApiResponse<?> response = employeeService.changeAvatar(token, file);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }
}
