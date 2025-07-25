package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import server.dtos.AddEmployeesRequestDto;
import server.dtos.ProjectEmployeeDto;
import server.dtos.RemoveEmployeesRequestDto;
import server.models.Employee;
import server.models.Project;
import server.repositories.EmployeeRepository;
import server.repositories.ProjectRepository;
import server.utils.ApiResponse;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectEmployeeService {

    private final ProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;
    public ApiResponse<?> searchAvailableByRoleAndName(Long projectId, String keyword) {
        String searchKeyword = keyword == null ? "" : keyword.trim();
        List<Employee> employees = employeeRepository.searchAvailableByRoleAndName(projectId, searchKeyword);

        List<ProjectEmployeeDto> result = employees.stream()
                .map(this::toDto)
                .toList();

        return ApiResponse.success(result, "search-available-employees-by-role-and-name-success");
    }
    public ApiResponse<?> getAvailableEmployees(Long projectId, String keyword, Long departmentId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }

        List<Employee> allCandidates = employeeRepository.findEmployeesNotInProjectWithValidRoles(projectId);

        List<Employee> filtered = allCandidates.stream()
                .filter(e -> {
                    if (keyword == null || keyword.isBlank()) return true;
                    String fullName = (e.getFirstName() + " " + e.getLastName()).toLowerCase();
                    return fullName.contains(keyword.toLowerCase());
                })
                .filter(e -> {
                    if (departmentId == null) return true;
                    return e.getDepartment() != null && Objects.equals(e.getDepartment().getId(), departmentId);
                })
                .toList();

        List<ProjectEmployeeDto> result = filtered.stream().map(this::toDto).toList();
        return ApiResponse.success(result, "available-employees-fetched-using-jpa");
    }

    public ApiResponse<?> getProjectEmployees(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }

        List<Employee> employees = project.getEmployees();
        List<ProjectEmployeeDto> result = employees.stream()
                .map(emp -> {
                    ProjectEmployeeDto dto = toDto(emp);
                    boolean hasSubTaskInProject = emp.getSubTasks() != null && emp.getSubTasks().stream()
                            .anyMatch(subTask -> subTask.getTask() != null &&
                                    subTask.getTask().getProject() != null &&
                                    Objects.equals(subTask.getTask().getProject().getId(), projectId));
                    dto.setCanRemove(!hasSubTaskInProject);
                    return dto;
                })
                .toList();

        return ApiResponse.success(result, "project-employees-fetched");
    }

    public ApiResponse<?> addEmployeesToProject(Long projectId, AddEmployeesRequestDto request) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }

        List<Employee> toAdd = employeeRepository.findAllById(request.getEmployeeIds());
        toAdd = toAdd.stream()
                .filter(e -> !project.getEmployees().contains(e)) // tránh trùng
                .toList();

        project.getEmployees().addAll(toAdd);
        projectRepository.save(project);
        return ApiResponse.success(null, "employees-added-successfully");
    }

    public ApiResponse<?> removeEmployeesFromProject(Long projectId, RemoveEmployeesRequestDto request) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return ApiResponse.notfound("project-not-found");
        }

        List<Employee> toRemove = employeeRepository.findAllById(request.getEmployeeIds());

        List<Employee> removable = toRemove.stream()
                .filter(project.getEmployees()::contains)
                .filter(emp -> emp.getSubTasks() == null || emp.getSubTasks().stream()
                        .noneMatch(st -> st.getTask() != null &&
                                st.getTask().getProject() != null &&
                                Objects.equals(st.getTask().getProject().getId(), projectId)))
                .toList();

        project.getEmployees().removeAll(removable);
        projectRepository.save(project);

        return ApiResponse.success(null, "employees-removed-successfully");
    }
    public ApiResponse<?> filterAvailable(Long projectId, String keyword, Long departmentId) {
        String key = keyword == null ? "" : keyword.trim();
        List<Employee> employees = employeeRepository.filterAvailableEmployees(projectId, departmentId, key);

        List<ProjectEmployeeDto> result = employees.stream()
                .map(this::toDto)
                .toList();

        return ApiResponse.success(result, "available-employees-filtered");
    }
    private ProjectEmployeeDto toDto(Employee e) {
        ProjectEmployeeDto dto = new ProjectEmployeeDto();
        dto.setId(e.getId());
        dto.setFirstName(e.getFirstName());
        dto.setLastName(e.getLastName());
        dto.setAvatar(e.getAvatar());
        dto.setEmail(e.getEmail());
        dto.setPhone(e.getPhone());
        dto.setDepartmentName(e.getDepartment() != null ? e.getDepartment().getName() : null);
        dto.setUsername(e.getAccount() != null ? e.getAccount().getUsername() : null);
        dto.setRole(e.getAccount() != null ? e.getAccount().getRole().name() : null);
        return dto;
    }
}