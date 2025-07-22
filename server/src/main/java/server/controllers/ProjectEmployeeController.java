package server.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import server.dtos.AddEmployeesRequestDto;
import server.dtos.RemoveEmployeesRequestDto;
import server.services.ProjectEmployeeService;

@RestController
@RequestMapping("/projects/{projectId}/employees")
@RequiredArgsConstructor
public class ProjectEmployeeController {

    private final ProjectEmployeeService projectEmployeeService;
    @GetMapping("/available/search")
    public ResponseEntity<?> searchByNameAndRole(
            @PathVariable Long projectId,
            @RequestParam String keyword
    ) {
        return ResponseEntity.ok(projectEmployeeService.searchAvailableByRoleAndName(projectId, keyword));
    }
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableEmployees(
            @PathVariable Long projectId,
            @RequestParam(required = false) String keyword,

            @RequestParam(required = false) Long departmentId
    ) {
        return ResponseEntity.ok(projectEmployeeService.getAvailableEmployees(projectId, keyword,  departmentId));
    }

    @PostMapping
    public ResponseEntity<?> addEmployees(
            @PathVariable Long projectId,
            @RequestBody AddEmployeesRequestDto request
    ) {
        return ResponseEntity.ok(projectEmployeeService.addEmployeesToProject(projectId, request));
    }

    @GetMapping
    public ResponseEntity<?> getProjectEmployees(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectEmployeeService.getProjectEmployees(projectId));
    }
    @GetMapping("/available/filter")
    public ResponseEntity<?> filterAvailableEmployees(
            @PathVariable Long projectId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long departmentId
    ) {
        return ResponseEntity.ok(
                projectEmployeeService.filterAvailable(projectId, keyword, departmentId)
        );
    }
    @DeleteMapping
    public ResponseEntity<?> removeEmployees(
            @PathVariable Long projectId,
            @RequestBody RemoveEmployeesRequestDto request
    ) {
        return ResponseEntity.ok(projectEmployeeService.removeEmployeesFromProject(projectId, request));
    }
}