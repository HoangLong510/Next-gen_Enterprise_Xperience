package server.services;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import server.dtos.CashAdvanceDto;
import server.dtos.CreateCashAdvanceDto;
import server.dtos.UpdateAdvanceStatusDto;
import server.models.Account;
import server.models.CashAdvanceRequest;
import server.models.Task;
import server.models.enums.CashAdvanceStatus;
import server.models.enums.Role;
import server.repositories.AccountRepository;
import server.repositories.CashAdvanceRequestRepository;
import server.repositories.TaskRepository;
import server.utils.ApiResponse;

import java.io.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CashAdvanceService {

    private final CashAdvanceRequestRepository repo;
    private final TaskRepository taskRepo;
    private final UploadFileService uploadFileService;
    private final NotificationService notificationService;
    private final AccountRepository accountRepo;

    /* ===================== Role checks ===================== */
    private boolean isAccountant(Account a) {
        return a != null && a.getRole() != null &&
                (a.getRole() == Role.ACCOUNTANT || a.getRole() == Role.ADMIN);
    }

    private boolean isChief(Account a) {
        return a != null && a.getRole() != null &&
                (a.getRole() == Role.CHIEFACCOUNTANT || a.getRole() == Role.ADMIN);
    }

    private boolean isDirector(Account a) {
        return a != null && a.getRole() != null &&
                (a.getRole() == Role.MANAGER || a.getRole() == Role.ADMIN);
    }

    /* ===================== Helpers ===================== */
    private Account resolveSingleByRole(Role role, String errIfMissing) {
        var list = accountRepo.findByRole(role);
        list = list == null ? List.of() : list.stream().filter(Account::isEnabled).toList();
        if (list.isEmpty()) throw new IllegalStateException(errIfMissing);
        if (list.size() > 1) throw new IllegalStateException("multiple-" + role.name().toLowerCase() + "-found");
        return list.get(0);
    }

    private Account resolveSingleDirector() {
        return resolveSingleByRole(Role.MANAGER, "no-manager-account");
    }

    private String toPublicUrl(String s) {
        if (s == null || s.isBlank()) return s;
        String x = s.replace("\\", "/");
        String low = x.toLowerCase();
        int i = low.indexOf("/uploads/");
        if (i < 0) i = low.indexOf("uploads/");
        if (i >= 0) x = x.substring(i);
        if (!x.startsWith("/")) x = "/" + x;
        return x;
    }

    private String safeName(Account a) {
        if (a == null) return "";
        try {
            var emp = a.getEmployee();
            if (emp != null) {
                String last = emp.getLastName() == null ? "" : emp.getLastName().trim();
                String first = emp.getFirstName() == null ? "" : emp.getFirstName().trim();
                String full = (last + " " + first).trim().replaceAll("\\s+", " ");
                if (!full.isBlank()) return full;
            }
        } catch (Exception ignore) {}
        return a.getUsername() == null ? "" : a.getUsername();
    }

    private String nvl(String s, String d) { return (s == null || s.isBlank()) ? d : s; }

    /* ===================== DTO convert ===================== */
    private CashAdvanceDto toDto(CashAdvanceRequest e) {
        CashAdvanceDto d = new CashAdvanceDto();
        d.setId(e.getId());
        Task t = e.getTask();
        d.setTaskId(t != null ? t.getId() : null);
        if (t != null) {
            d.setTaskName(t.getName());
            var p = t.getPhase();
            if (p != null) {
                d.setPhaseId(p.getId());
                d.setPhaseName(p.getName());
                var proj = p.getProject();
                if (proj != null) {
                    d.setProjectId(proj.getId());
                    d.setProjectName(proj.getName());
                }
            }
        }
        d.setAmount(e.getAmount());
        d.setReason(e.getReason());
        d.setStatus(e.getStatus());
        d.setFileUrl(toPublicUrl(e.getFileUrl()));
        if (e.getCreatedBy() != null) {
            d.setCreatedById(e.getCreatedBy().getId());
            d.setCreatedByUsername(e.getCreatedBy().getUsername());
        }
        if (e.getApprovedBy() != null) {
            d.setApprovedById(e.getApprovedBy().getId());
            d.setApprovedByUsername(e.getApprovedBy().getUsername());
        }
        if (e.getChiefAssignee() != null) {
            d.setChiefAssigneeId(e.getChiefAssignee().getId());
            d.setChiefAssigneeUsername(e.getChiefAssignee().getUsername());
        }
        if (e.getDirectorAssignee() != null) {
            d.setDirectorAssigneeId(e.getDirectorAssignee().getId());
            d.setDirectorAssigneeUsername(e.getDirectorAssignee().getUsername());
        }
        d.setRejectNote(e.getRejectNote());
        d.setSentToChiefAt(e.getSentToChiefAt());
        d.setChiefApprovedAt(e.getChiefApprovedAt());
        d.setSentToDirectorAt(e.getSentToDirectorAt());
        d.setDirectorApprovedAt(e.getDirectorApprovedAt());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    /* ===================== Commands ===================== */

    @Transactional
    public ApiResponse<?> create(Account creator, CreateCashAdvanceDto payload, MultipartFile file) {
        if (payload.getTaskId() == null || payload.getAmount() == null || payload.getAmount() <= 0) {
            return ApiResponse.badRequest("invalid-params");
        }
        Task task = taskRepo.findWithPhaseAndProjectById(payload.getTaskId()).orElse(null);
        if (task == null) return ApiResponse.notfound("task-not-found");

        CashAdvanceRequest r = new CashAdvanceRequest();
        r.setTask(task);
        r.setAmount(payload.getAmount());
        r.setReason(payload.getReason());
        r.setStatus(CashAdvanceStatus.PENDING);
        r.setCreatedBy(creator);

        try {
            if (file != null && !file.isEmpty()) {
                String storedPath = uploadFileService.storeFile("cash-advances", file);
                r.setFileUrl(toPublicUrl(storedPath));
            }
        } catch (Exception ex) {
            return ApiResponse.badRequest("file-upload-failed");
        }

        repo.save(r);
        return ApiResponse.success(toDto(r), "create-cash-advance-success");
    }

    @Transactional
    public ApiResponse<?> accountantApprove(Account actor, Long id, boolean approve, String note) {
        if (!isAccountant(actor)) return ApiResponse.badRequest("only-accountant");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.PENDING)
            return ApiResponse.badRequest("must-be-pending");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_ACCOUNTANT);
            r.setApprovedBy(actor);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setApprovedBy(actor);
            r.setRejectNote(note);
        }
        repo.save(r);
        return ApiResponse.success(toDto(r), approve ? "accountant-approved" : "accountant-rejected");
    }

    @Transactional
    public ApiResponse<?> chiefApprove(Account actor, Long id, boolean approve, String note) {
        if (!isChief(actor)) return ApiResponse.badRequest("only-chief");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.APPROVED_ACCOUNTANT)
            return ApiResponse.badRequest("must-be-approved-by-accountant");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_CHIEF);
            r.setChiefApprovedAt(LocalDateTime.now());
            r.setChiefAssignee(actor);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setChiefAssignee(actor);
            r.setRejectNote(note);
        }
        repo.save(r);
        return ApiResponse.success(toDto(r), approve ? "chief-approved" : "chief-rejected");
    }

    @Transactional
    public ApiResponse<?> directorApprove(Account actor, Long id, boolean approve, String note) {
        if (!isDirector(actor)) return ApiResponse.badRequest("only-director");
        var r = repo.findById(id).orElse(null);
        if (r == null) return ApiResponse.notfound("not-found");
        if (r.getStatus() != CashAdvanceStatus.APPROVED_CHIEF)
            return ApiResponse.badRequest("must-be-approved-by-chief");

        if (approve) {
            r.setStatus(CashAdvanceStatus.APPROVED_DIRECTOR);
            r.setDirectorApprovedAt(LocalDateTime.now());
            r.setDirectorAssignee(actor);
        } else {
            r.setStatus(CashAdvanceStatus.REJECTED);
            r.setDirectorAssignee(actor);
            r.setRejectNote(note);
        }
        repo.save(r);
        return ApiResponse.success(toDto(r), approve ? "director-approved" : "director-rejected");
    }

    /* ===================== Queries ===================== */

    public ApiResponse<?> list(Account me, String statusStr, String scope) {
        Set<CashAdvanceStatus> statuses = null;
        if (statusStr != null && !statusStr.isBlank() && !"ALL".equalsIgnoreCase(statusStr)) {
            statuses = new LinkedHashSet<>();
            for (String s : statusStr.split(",")) {
                try { statuses.add(CashAdvanceStatus.valueOf(s.trim().toUpperCase())); }
                catch (Exception ignore) {}
            }
            if (statuses.isEmpty()) statuses = null;
        }

        boolean onlyMy = "MY".equalsIgnoreCase(scope);
        List<CashAdvanceRequest> list;
        if (onlyMy) {
            list = (statuses == null)
                    ? repo.findByCreatedBy_IdOrderByIdDesc(me.getId())
                    : repo.findByCreatedBy_IdAndStatusInOrderByIdDesc(me.getId(), statuses);
        } else {
            list = (statuses == null)
                    ? repo.findAllByOrderByIdDesc()
                    : repo.findByStatusInOrderByIdDesc(statuses);
        }

        return ApiResponse.success(list.stream().map(this::toDto).toList(), "cash-advance-list");
    }

    public ApiResponse<?> myRequests(Account me) {
        var list = repo.findByCreatedBy_IdOrderByIdDesc(me.getId());
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "my-cash-advance-list");
    }

    public ApiResponse<?> pendingForAccountant() {
        var list = repo.findByStatusOrderByIdDesc(CashAdvanceStatus.PENDING);
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "pending-accountant");
    }

    public ApiResponse<?> pendingForChief() {
        var list = repo.findByStatusOrderByIdDesc(CashAdvanceStatus.APPROVED_ACCOUNTANT);
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "pending-chief");
    }

    public ApiResponse<?> pendingForDirector() {
        var list = repo.findByStatusOrderByIdDesc(CashAdvanceStatus.APPROVED_CHIEF);
        return ApiResponse.success(list.stream().map(this::toDto).toList(), "pending-director");
    }
}
