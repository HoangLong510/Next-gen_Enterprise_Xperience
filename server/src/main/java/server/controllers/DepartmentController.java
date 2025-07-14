package server.controllers;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.GetDepartmentsPageDto;
import server.dtos.SaveDepartmentDto;
import server.dtos.ToggleEmployeeDepartmentDto;
import server.services.DepartmentService;
import server.utils.ApiResponse;

@RestController
@RequestMapping("/departments")
@RequiredArgsConstructor
public class DepartmentController {
    private final DepartmentService departmentService;

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'HOD', 'EMPLOYEE')")
    @PostMapping("/get-departments-page")
    public ResponseEntity<?> getDepartmentsPage(@RequestBody GetDepartmentsPageDto req) {
        try {
            ApiResponse<?> response = departmentService.getDepartmentsPage(req);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PostMapping("/create")
    public ResponseEntity<?> createDepartment(
            @ModelAttribute @Valid SaveDepartmentDto req,
            @RequestParam("file") MultipartFile file,
            BindingResult result
    ) {
        try {
            ApiResponse<?> response = departmentService.createDepartment(req, file, result);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PostMapping("/edit")
    public ResponseEntity<?> editDepartment(
            @ModelAttribute @Valid SaveDepartmentDto req,
            @RequestParam("file") MultipartFile file,
            BindingResult result
    ) {
        try {
            ApiResponse<?> response = departmentService.editDepartment(req, file, result);
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PostMapping("/toggle-add-or-remove-employee")
    public ResponseEntity<?> toggleAddOrRemoveEmployee(@RequestBody ToggleEmployeeDepartmentDto req) {
        try {
            ApiResponse<?> response = departmentService.toggleAddOrRemoveEmployee(req.getId(), req.getEmployeeId());
            return ResponseEntity.status(response.getStatus()).body(response);
        } catch (Exception e) {
            ApiResponse<?> response = ApiResponse.errorServer(e.getMessage());
            return ResponseEntity.status(response.getStatus()).body(response);
        }
    }
}
