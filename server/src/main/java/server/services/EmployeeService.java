package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.BindingResult;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CreateEmployeeDto;
import server.models.Account;
import server.models.Employee;
import server.models.enums.Gender;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.EmployeeRepository;
import server.utils.ApiResponse;
import server.utils.JwtUtil;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountRepository accountRepository;
    private final UploadFileService uploadFileService;
    private final JwtUtil jwtUtil;

    public ApiResponse<?> create(CreateEmployeeDto request, BindingResult result) {
        if(!request.getPassword().equals(request.getConfirmPassword())) {
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

    public ApiResponse<?> changeAvatar(String token, MultipartFile file){
        try{
            String accessToken = token.substring(7);
            String username = jwtUtil.extractUsername(accessToken);
            Account account = accountRepository.findByUsername(username).orElse(null);
            if (account == null) {
                return ApiResponse.unauthorized();
            }

            // nếu không có file
            if(file.isEmpty()){
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
            String filePath = uploadFileService.storeImage("images", file).replace("\\", "/");

            // nếu user đã có ảnh đại diện từ xóa cái cũ
            if(account.getEmployee().getAvatar() != null){
                uploadFileService.deleteFile(account.getEmployee().getAvatar());
            }

            account.getEmployee().setAvatar(filePath);
            accountRepository.save(account);

            return ApiResponse.success(filePath, "change-avatar-successfully");
        } catch (Exception e) {
            return ApiResponse.badRequest("error-uploading-file");
        }
    }
}
