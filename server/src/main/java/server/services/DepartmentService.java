package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.validation.BindingResult;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.SaveDepartmentDto;
import server.dtos.DepartmentDto;
import server.dtos.GetDepartmentsPageDto;
import server.models.Account;
import server.models.Department;
import server.models.Employee;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.DepartmentRepository;
import server.repositories.EmployeeRepository;
import server.specification.DepartmentSpecifications;
import server.utils.ApiResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DepartmentService {
    private final DepartmentRepository departmentRepository;
    private final AccountRepository accountRepository;
    private final EmployeeRepository employeeRepository;
    private final UploadFileService uploadFileService;

    public ApiResponse<?> getDepartmentsPage(GetDepartmentsPageDto req) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        Account account = accountRepository.findByUsername(username).orElse(null);

        if (account == null) {
            return ApiResponse.unauthorized();
        }

        int pageSize = 6;
        int pageNumber = Math.max(1, req.getPageNumber()) - 1;

        Sort.Direction direction = Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, direction, "createdAt");

        Specification<Department> spec = DepartmentSpecifications.searchTerm(req.getSearchTerm())
                .and(DepartmentSpecifications.filterByRoleAndEmployee(
                        account.getRole(),
                        account.getEmployee().getId()
                ));

        Page<Department> page = departmentRepository.findAll(spec, pageable);

        List<DepartmentDto> dtoList = page.getContent().stream()
                .map(department -> {
                    DepartmentDto dto = new DepartmentDto();
                    dto.setId(department.getId());
                    dto.setName(department.getName());
                    dto.setDescription(department.getDescription());
                    dto.setCreatedAt(department.getCreatedAt());
                    dto.setUpdatedAt(department.getUpdatedAt());
                    dto.setImage(department.getImage());

                    int employeeCount = department.getEmployees().size();
                    if (department.getHod() != null) {
                        employeeCount++;
                    }
                    dto.setEmployeeCount(employeeCount);

                    Map<String, Object> hod = new HashMap<>();
                    hod.put("id", department.getHod().getId());
                    hod.put("firstName", department.getHod().getFirstName());
                    hod.put("lastName", department.getHod().getLastName());
                    hod.put("avatar", department.getHod().getAvatar());
                    dto.setHod(hod);
                    return dto;
                })
                .toList();

        Map<String, Object> responseData = new HashMap<>();

        responseData.put("totalPage", page.getTotalPages());
        responseData.put("departments", dtoList);

        return ApiResponse.success(responseData, "get-departments-page-success");
    }

    public ApiResponse<?> createDepartment(SaveDepartmentDto req, MultipartFile file, BindingResult result) {
        try {
            if (departmentRepository.existsByName(req.getName())) {
                result.rejectValue("name", "", "department-already-exists");
            }

            Employee hod = employeeRepository.findById(req.getHodId()).orElse(null);
            if (hod == null) {
                result.rejectValue("hodId", "", "hod-id-not-found");
            } else {
                if (hod.getAccount().getRole() != Role.HOD) {
                    result.rejectValue("hodId", "", "hod-role-is-invalid");
                } else {
                    if (hod.getHodDepartment() != null) {
                        result.rejectValue("hodId", "", "the-hod-has-a-department");
                    }
                }
            }

            if (file.isEmpty()) {
                result.rejectValue("file", "", "file-is-empty");
            } else {
                String contentType = file.getContentType();
                if (contentType == null ||
                        !(contentType.equals("image/jpeg") ||
                                contentType.equals("image/png") ||
                                contentType.equals("image/gif"))) {
                    result.rejectValue("file", "", "invalid-image-type");
                }
            }

            if (result.hasErrors()) {
                return ApiResponse.badRequest(result);
            }

            String filePath = uploadFileService.storeFile("images/departments", file).replace("\\", "/");

            Department department = new Department();
            department.setName(req.getName());
            department.setDescription(req.getDescription());
            department.setHod(hod);
            department.setImage(filePath);

            departmentRepository.save(department);
            return ApiResponse.created(null, "create-department-success");
        } catch (Exception e) {
            return ApiResponse.badRequest("error-uploading-file");
        }
    }

    public ApiResponse<?> editDepartment(SaveDepartmentDto req, MultipartFile file, BindingResult result) {
        try {
            Department department = departmentRepository.findById(req.getId()).orElse(null);

            if (department == null) {
                return ApiResponse.badRequest("department-not-found");
            }

            if (!req.getName().equals(department.getName()) && departmentRepository.existsByName(req.getName())) {
                result.rejectValue("name", "", "department-already-exists");
            }

            Employee hod = employeeRepository.findById(req.getHodId()).orElse(null);
            if (hod == null) {
                result.rejectValue("hodId", "", "hod-id-not-found");
            } else {
                if (hod.getAccount().getRole() != Role.HOD) {
                    result.rejectValue("hodId", "", "hod-role-is-invalid");
                } else {
                    if (!department.getHod().getId().equals(hod.getId()) && hod.getHodDepartment() != null) {
                        result.rejectValue("hodId", "", "the-hod-has-a-department");
                    }
                }
            }

            if (file != null && !file.isEmpty()) {
                String contentType = file.getContentType();
                if (contentType == null ||
                        !(contentType.equals("image/jpeg") ||
                                contentType.equals("image/png") ||
                                contentType.equals("image/gif"))) {

                    result.rejectValue("file", "", "invalid-image-type");
                }
            }

            if (result.hasErrors()) {
                return ApiResponse.badRequest(result);
            }

            if (file != null && !file.isEmpty()) {
                String filePath = uploadFileService.storeFile("images/departments", file).replace("\\", "/");
                uploadFileService.deleteFile(department.getImage());
                department.setImage(filePath);
            }

            department.setName(req.getName());
            department.setDescription(req.getDescription());
            department.setHod(hod);

            departmentRepository.save(department);

            return ApiResponse.success(null, "edit-department-success");
        } catch (Exception e) {
            return ApiResponse.badRequest("error-uploading-file");
        }
    }

    public ApiResponse<?> toggleAddOrRemoveEmployee(Long id, Long employeeId) {
        Department department = departmentRepository.findById(id).orElse(null);
        if (department == null) {
            return ApiResponse.badRequest("department-not-found");
        }
        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        if (employee == null) {
            return ApiResponse.badRequest("employee-not-found");
        }
        if (employee.getDepartment() != null) {
            employee.setDepartment(null);
        } else {
            employee.setDepartment(department);
        }
        employeeRepository.save(employee);
        return ApiResponse.success(null, "update-department-success");
    }

    public ApiResponse<?> getDepartmentById(Long id) {
        Department department = departmentRepository.findById(id).orElse(null);
        if (department == null) {
            return ApiResponse.badRequest("department-not-found");
        }
        return ApiResponse.success(department, "get-department-success");
    }
}
