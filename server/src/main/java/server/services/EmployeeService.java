package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.BindingResult;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CreateEmployeeDto;
import server.dtos.EmployeeDepartmentDto;
import server.dtos.GetEmployeesToAddToDepartmentDto;
import server.models.Account;
import server.models.Department;
import server.models.Employee;
import server.models.enums.Gender;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.EmployeeRepository;
import server.specification.DepartmentSpecifications;
import server.specification.EmployeeSpecification;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountRepository accountRepository;
    private final UploadFileService uploadFileService;
    private final JwtUtil jwtUtil;

    public ApiResponse<?> create(CreateEmployeeDto request, BindingResult result) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            result.rejectValue("confirmPassword", "", "confirm-password-does-not-match");
        }

        boolean existsUsername = accountRepository.findByUsername(request.getUsername()).isPresent();
        if (existsUsername) {
            result.rejectValue("username", "", "username-already-exists");
        }

        boolean existsEmail = employeeRepository.findByEmail(request.getEmail()).isPresent();
        if (existsEmail) {
            result.rejectValue("email", "", "email-already-exists");
        }

        boolean existsPhone = employeeRepository.findByPhone(request.getPhone()).isPresent();
        if (existsPhone) {
            result.rejectValue("phone", "", "phone-already-exists");
        }

        if (result.hasErrors()) {
            return ApiResponse.badRequest(result);
        }

        Account account = new Account();
        account.setUsername(request.getUsername());
        account.setPassword(passwordEncoder.encode(request.getPassword()));
        account.setRole(Role.valueOf(request.getRole()));
        account.setEnabled(true);

        Employee employee = new Employee();
        employee.setFirstName(request.getFirstName());
        employee.setLastName(request.getLastName());
        employee.setEmail(request.getEmail());
        employee.setPhone(request.getPhone());
        employee.setAddress(request.getAddress());
        employee.setGender(Gender.valueOf(request.getGender()));
        employee.setDateBirth(request.getDateBirth());
        employee.setAccount(account);
        employeeRepository.save(employee);

        return ApiResponse.created(null, "employee-created-successfully");
    }

    public ApiResponse<?> changeAvatar(MultipartFile file) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            Account account = accountRepository.findByUsername(username).orElse(null);

            // nếu không có file
            if (file.isEmpty()) {
                return ApiResponse.badRequest("file-is-empty");
            }

            // kiểm tra đuôi file jpg/png/gif
            String contentType = file.getContentType();
            if (contentType == null ||
                    !(contentType.equals("image/jpeg") ||
                            contentType.equals("image/png") ||
                            contentType.equals("image/gif"))) {
                return ApiResponse.badRequest("invalid-image-type");
            }

            // lưu file
            String filePath = uploadFileService.storeFile("images", file).replace("\\", "/");

            // nếu user đã có ảnh đại diện từ xóa cái cũ
            if (account.getEmployee().getAvatar() != null) {
                uploadFileService.deleteFile(account.getEmployee().getAvatar());
            }

            account.getEmployee().setAvatar(filePath);
            accountRepository.save(account);

            return ApiResponse.success(filePath, "change-avatar-successfully");
        } catch (Exception e) {
            return ApiResponse.badRequest("error-uploading-file");
        }
    }

    public ApiResponse<?> getListHod() {
        List<Employee> listHod = employeeRepository.findAllByAccountRole(Role.HOD);
        return ApiResponse.success(listHod, "successfully");
    }

    public ApiResponse<?> GetEmployeesToAddToDepartment(GetEmployeesToAddToDepartmentDto req) {
        int pageSize = 6;
        int pageNumber = Math.max(1, req.getPageNumber()) - 1;

        Sort.Direction direction = Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(pageNumber, pageSize, direction, "createdAt");

        Specification<Employee> spec = EmployeeSpecification.searchTerm(req.getSearchTerm());

        if("true".equalsIgnoreCase(req.getFilterInDepartment())){
            spec = spec.and(EmployeeSpecification.inDepartment(req.getId()));
        } else if("false".equalsIgnoreCase(req.getFilterInDepartment())){
            spec = spec.and(EmployeeSpecification.noDepartment());
        } else {
            spec = spec.and(EmployeeSpecification.inDepartmentOrNoDepartment(req.getId()));
        }

        spec = spec.and(EmployeeSpecification.hasAnyRole(List.of(Role.EMPLOYEE)));

        Page<Employee> page = employeeRepository.findAll(spec, pageable);

        List<EmployeeDepartmentDto> dtoList = page.getContent().stream()
                .map(emp -> {
                    EmployeeDepartmentDto dto = new EmployeeDepartmentDto();
                    boolean inDepartment = false;
                    if (emp.getDepartment() != null) {
                        if (emp.getDepartment().getId().equals(req.getId())) {
                            inDepartment = true;
                        }
                    }
                    dto.setId(emp.getId());
                    dto.setFirstName(emp.getFirstName());
                    dto.setLastName(emp.getLastName());
                    dto.setEmail(emp.getEmail());
                    dto.setPhone(emp.getPhone());
                    dto.setAddress(emp.getAddress());
                    dto.setAvatar(emp.getAvatar());
                    dto.setUsername(emp.getAccount().getUsername());
                    dto.setInDepartment(inDepartment);
                    return dto;
                })
                .toList();

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("totalPage", page.getTotalPages());
        responseData.put("employees", dtoList);

        return ApiResponse.success(responseData, "get-employees-to-add-to-department-successfully");
    }
}
