package server.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import server.dtos.CreatePhaseDto;
import server.dtos.PhaseDto;
import server.dtos.UpdatePhaseDto;
import server.services.PhaseService;
import server.utils.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/phases")
@RequiredArgsConstructor
public class PhaseController {

    private final PhaseService phaseService;

    // Tạo phase cho 1 project
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
      (hasAuthority('PM') and @projectService.isProjectManager(#projectId, authentication.name))
    """)
    @PostMapping("/project/{projectId}")
    public ApiResponse<PhaseDto> createPhase(
            @PathVariable Long projectId,
            @Valid @RequestBody CreatePhaseDto dto,
            BindingResult br
    ) {
        if (br.hasErrors()) return ApiResponse.badRequest(br);
        return phaseService.createPhase(projectId, dto);
    }

    // Lấy phases (không kèm tasks) theo project
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
     (hasAuthority('PM') and @projectService.isProjectManager(#projectId, authentication.name)) or
      (hasAnyAuthority('EMPLOYEE','HOD') and @projectService.hasProjectAccess(#projectId, authentication.name))
    """)
    @GetMapping("/project/{projectId}")
    public ApiResponse<List<PhaseDto>> getPhasesByProject(@PathVariable Long projectId) {
        return phaseService.getPhasesByProject(projectId);
    }

    // Cập nhật phase theo phaseId
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
      (hasAuthority('PM') and @phaseService.isProjectManagerOfPhase(#id, authentication.name))
    """)
    @PutMapping("/{id}")
    public ApiResponse<PhaseDto> updatePhase(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePhaseDto dto,
            BindingResult br
    ) {
        if (br.hasErrors()) return ApiResponse.badRequest(br);
        return phaseService.updatePhase(id, dto);
    }

    // Lấy phases (kèm tasks) theo project
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
    (hasAuthority('PM') and @projectService.isProjectManager(#projectId, authentication.name)) or
      (hasAnyAuthority('EMPLOYEE','HOD') and @projectService.hasProjectAccess(#projectId, authentication.name))
    """)
    @GetMapping("/project/{projectId}/with-tasks")

    public ApiResponse<List<PhaseDto>> getPhasesWithTasksByProject(
            @PathVariable Long projectId,
            HttpServletRequest request
    ) {
        return phaseService.getPhasesWithTasksByProject(projectId, request);}

    // Lấy chi tiết phase theo phaseId
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
      (hasAuthority('PM') and @phaseService.isProjectManagerOfPhase(#id, authentication.name))
    """)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PhaseDto>> getPhaseDetail(@PathVariable Long id) {
        ApiResponse<PhaseDto> resp = phaseService.getPhaseById(id);
        if (resp.getStatus() == 404) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resp);
        }
        return ResponseEntity.ok(resp);
    }

    // Start phase (theo phaseId)
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
      (hasAuthority('PM') and @phaseService.isProjectManagerOfPhase(#id, authentication.name))
    """)
    @PostMapping("/{id}/start")
    public ApiResponse<?> startPhase(@PathVariable Long id) {
        return phaseService.startPhase(id);
    }

    // Complete phase (theo phaseId)
    @PreAuthorize("""
      hasAnyAuthority('ADMIN','MANAGER') or
      (hasAuthority('PM') and @phaseService.isProjectManagerOfPhase(#id, authentication.name))
    """)
    @PostMapping("/{id}/complete")
    public ApiResponse<?> completePhase(@PathVariable Long id) {
        return phaseService.completePhase(id);
    }
}
