package server.dtos;

import server.models.Project;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ProjectUpdateDto {
    public Long id;
    public String name;
    public String description;
    public LocalDate createdAt;
    public LocalDate deadline;
    public LocalDateTime completedAt;
    public String status;
    public String priority;

    public Long documentId;
    public String documentTitle;

    public String pmName;

    public ProjectUpdateDto(Project project) {
        this.id = project.getId();
        this.name = project.getName();
        this.description = project.getDescription();
        this.createdAt = project.getCreatedAt();
        this.deadline = project.getDeadline();
        this.completedAt = project.getCompletedAt();
        this.status = project.getStatus() != null ? project.getStatus().name() : null;
        this.priority = project.getPriority() != null ? project.getPriority().name() : null;

        // 🗂 Document info
        if (project.getDocument() != null) {
            this.documentId = project.getDocument().getId();
            this.documentTitle = project.getDocument().getTitle(); // dùng title để hiển thị
        }

        // 👤 Project Manager info
        if (project.getProjectManager() != null) {
            var employee = project.getProjectManager().getEmployee();
            if (employee != null) {
                this.pmName = employee.getFirstName() + " " + employee.getLastName();
            } else {
                this.pmName = project.getProjectManager().getUsername(); // fallback nếu không có employee
            }
        }
    }
}