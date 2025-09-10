package server.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CreateEmployeeDto;
import server.dtos.GetEmployeesToAddToDepartmentDto;
import server.services.EmployeeService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
public class EmployeeController {
    private final EmployeeService employeeService;

    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
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

    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
    @PostMapping("/edit")
    public ResponseEntity<?> edit(@Valid @RequestBody CreateEmployeeDto request, BindingResult result) {
        try {
            ApiResponse<?> response = employeeService.edit(request, result);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PostMapping("/change-avatar")
    public ResponseEntity<?> changeAvatar(@RequestParam("file") MultipartFile file) {
        try {
            ApiResponse<?> response = employeeService.changeAvatar(file);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @GetMapping("/get-list-hod")
    public ResponseEntity<?> getListHod() {
        try {
            ApiResponse<?> response = employeeService.getListHod();
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PostMapping("/get-employees-to-add-to-department")
    public ResponseEntity<?> getEmployeesToAddToDepartment(@RequestBody GetEmployeesToAddToDepartmentDto req) {
        try {
            ApiResponse<?> response = employeeService.GetEmployeesToAddToDepartment(req);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'HR', 'MANAGER')")
    @GetMapping("/get-employee-details-by-account-id/{id}")
    public ResponseEntity<?> getEmployeeDetailsByAccountId(@PathVariable("id") Long id) {
        try {
            ApiResponse<?> response = employeeService.getEmployeeDetailsByAccountId(id);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    // phần thêm của quân
    @GetMapping("/simple-list")
    public ApiResponse<?> getSimpleEmployeeList() {
        return employeeService.getSimpleEmployeeList();
    }
    // hết phần thêm của quân
}
