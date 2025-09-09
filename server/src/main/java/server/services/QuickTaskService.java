package server.services;

import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.dtos.AccountDto;
import server.dtos.AddEmployeesRequestDto;
import server.dtos.DepartmentDto;
import server.dtos.TaskDto;
import server.models.*;
import server.models.enums.PhaseStatus;
import server.models.enums.TaskSize;
import server.models.enums.TaskStatus;
import server.repositories.DepartmentRepository;
import server.repositories.EmployeeRepository;
import server.repositories.PhaseRepository;
import server.repositories.ProjectRepository;
import server.repositories.TaskRepository;
import server.utils.ApiResponse;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class QuickTaskService {

    private final ProjectRepository projectRepo;
    private final PhaseRepository phaseRepo;
    private final TaskRepository taskRepo;
    private final EmployeeRepository employeeRepo;
    private final DepartmentRepository departmentRepository;
    private final ProjectEmployeeService projectEmployeeService;

    /* ===================== CREATE 1 TASK ===================== */

    public ApiResponse<TaskDto> createFromProject(
            Long projectId,
            @Nullable String overrideName,
            @Nullable String overrideDescription,
            @Nullable String overrideImageUrl
    ) {
        Project p = projectRepo.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        Phase phase = resolvePhase(p);

        TaskPayload payload = buildFromProject(p, phase, overrideName, overrideDescription, overrideImageUrl, null);

        String baseName = payload.name();
        String withAssignee = appendAssigneeSuffix(baseName, payload.assignee());
        String finalName = ensureUniqueName(phase.getId(), withAssignee);

        Task t = Task.builder()
                .name(finalName)
                .description(payload.description())
                 .imageUrl(payload.imageUrl())
                .size(payload.size())
                .deadline(payload.deadline())
                .status(TaskStatus.IN_PROGRESS)
                .phase(phase)
                .assignee(payload.assignee())
                .hidden(false)
                .build();
        taskRepo.save(t);

        return ApiResponse.created(TaskMapper.toDto(t), "task-created");
    }

    /* ===================== CREATE NHIỀU TASK ===================== */

    public ApiResponse<List<TaskDto>> createManyFromProject(
            Long projectId,
            @Nullable String overrideName,
            @Nullable String overrideDescription,
            @Nullable String overrideImageUrl,
            @Nullable List<Long> assigneeEmployeeIds,
            @Nullable List<Long> departmentIds
    ) {
        Project p = projectRepo.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        Phase phase = resolvePhase(p);
        List<Task> created = new ArrayList<>();

        Set<Long> targetIds = new LinkedHashSet<>();
        if (assigneeEmployeeIds != null) {
            assigneeEmployeeIds.stream().filter(Objects::nonNull).forEach(targetIds::add);
        }
        if (departmentIds != null && !departmentIds.isEmpty()) {
            employeeRepo.findByDepartment_IdIn(departmentIds).forEach(e -> {
                if (e != null && e.getId() != null) targetIds.add(e.getId());
            });
        }

        if (targetIds.isEmpty()) {
            TaskPayload payload = buildFromProject(p, phase, overrideName, overrideDescription, overrideImageUrl, null);
            String withAssignee = appendAssigneeSuffix(payload.name(), payload.assignee());
            String finalName = ensureUniqueName(phase.getId(), withAssignee);
            created.add(persistTask(phase, payload, finalName));
            return ApiResponse.created(created.stream().map(TaskMapper::toDto).toList(), "tasks-created");
        }

        AddEmployeesRequestDto addReq = new AddEmployeesRequestDto();
        addReq.setEmployeeIds(new ArrayList<>(targetIds));
        projectEmployeeService.addEmployeesToProject(projectId, addReq);

        List<Employee> assignees = employeeRepo.findAllById(targetIds).stream()
                .filter(Objects::nonNull)
                .toList();

        for (Employee emp : assignees) {
            TaskPayload payload = buildFromProject(p, phase, overrideName, overrideDescription, overrideImageUrl, emp);
            String withAssignee = appendAssigneeSuffix(payload.name(), emp);
            String finalName = ensureUniqueName(phase.getId(), withAssignee);
            created.add(persistTask(phase, payload, finalName));
        }

        return ApiResponse.created(created.stream().map(TaskMapper::toDto).toList(), "tasks-created");
    }

    /* ===================== HELPERS ===================== */

    private Task persistTask(Phase phase, TaskPayload payload, String finalName) {
        Task t = Task.builder()
                .name(finalName)
                .description(payload.description())
                .imageUrl(payload.imageUrl())
                .size(payload.size())
                .deadline(payload.deadline())
                .status(TaskStatus.IN_PROGRESS)
                .phase(phase)
                .assignee(payload.assignee())
                .hidden(false)
                .build();
        return taskRepo.save(t);
    }

    private String ensureUniqueName(Long phaseId, String name) {
        if (!taskRepo.existsByPhaseIdAndNameIgnoreCaseAndHiddenFalse(phaseId, name)) {
            return name;
        }
        int k = 2;
        String candidate = name + " (" + k + ")";
        while (taskRepo.existsByPhaseIdAndNameIgnoreCaseAndHiddenFalse(phaseId, candidate)) {
            k++;
            candidate = name + " (" + k + ")";
        }
        return candidate;
    }

    private String appendAssigneeSuffix(String baseName, @Nullable Employee assignee) {
        String username = (assignee != null && assignee.getAccount() != null)
                ? assignee.getAccount().getUsername()
                : null;
        if (username != null && !username.isBlank()) {
            return baseName + " - @" + username;
        }
        return baseName;
    }

    private Phase resolvePhase(Project p) {
        List<Phase> phases = phaseRepo.findByProjectIdOrderBySequenceAsc(p.getId());
        if (!phases.isEmpty()) return phases.get(0);

        Phase main = Phase.builder()
                .name("Main")
                .deadline(p.getDeadline())
                .status(PhaseStatus.IN_PROGRESS)
                .sequence(1)
                .project(p)
                .build();
        return phaseRepo.save(main);
    }

    private TaskPayload buildFromProject(Project p, Phase phase,
                                         @Nullable String overrideName,
                                         @Nullable String overrideDescription,
                                         @Nullable String overrideImageUrl,
                                         @Nullable Employee assigneeOverride) {

        String name = (overrideName != null && !overrideName.isBlank())
                ? overrideName.trim()
                : "Kickoff: " + p.getName();

        String desc = (overrideDescription != null && !overrideDescription.isBlank())
                ? overrideDescription.trim()
                : (p.getDescription() != null ? p.getDescription().trim() : "");

        String img = (overrideImageUrl != null && !overrideImageUrl.isBlank())
                ? overrideImageUrl.trim()
                : null;

        TaskSize size = TaskSize.M;

        LocalDate deadline = (phase.getDeadline() != null)
                ? phase.getDeadline()
                : (p.getDeadline() != null ? p.getDeadline() : LocalDate.now().plusDays(7));

        Employee assignee = assigneeOverride;
        if (assignee == null && p.getProjectManager() != null && p.getProjectManager().getEmployee() != null) {
            assignee = p.getProjectManager().getEmployee();
        }

        return new TaskPayload(name, desc, img, size, deadline, assignee);
    }

    /* ===================== DTO nội bộ ===================== */
    record TaskPayload(String name,
                       String description,
                       String imageUrl,          // <— thêm field
                       TaskSize size,
                       LocalDate deadline,
                       Employee assignee) {}

    /* ===================== PHỤ TRỢ KHÁC (giữ nguyên) ===================== */

    public ApiResponse<List<DepartmentDto>> getDepartments() {
        List<DepartmentDto> data = departmentRepository.findAll().stream().map(d -> {
            DepartmentDto dto = new DepartmentDto();
            dto.setId(d.getId());
            dto.setName(d.getName());
            return dto;
        }).toList();
        return ApiResponse.success(data, "fetch departments successful");
    }

    public ApiResponse<List<AccountDto>> searchEmployees(String q, Integer limit, Long departmentId) {
        int size = (limit == null || limit <= 0 || limit > 100) ? 20 : limit;
        List<Employee> employees = employeeRepo.searchEmployeesWithDepartment(q, departmentId);

        List<AccountDto> data = employees.stream()
                .limit(size)
                .map(e -> {
                    AccountDto dto = new AccountDto();
                    dto.setId(e.getId());
                    dto.setFirstName(e.getFirstName());
                    dto.setLastName(e.getLastName());
                    dto.setEmail(e.getEmail());
                    dto.setPhone(e.getPhone());
                    dto.setAvatar(e.getAvatar());
                    return dto;
                })
                .toList();

        return ApiResponse.success(data, "fetch employees successful");
    }
}
