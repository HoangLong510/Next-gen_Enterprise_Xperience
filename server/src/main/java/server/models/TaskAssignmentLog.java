// server/models/TaskAssignmentLog.java
package server.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "task_assignment_logs",
        indexes = {
                @Index(name = "idx_task_changed_at", columnList = "task_id, changed_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskAssignmentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK -> Task
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    // Ai đổi
    @Column(name = "changed_by_id", nullable = false)
    private Long changedById;

    @Column(name = "changed_by_name", length = 200)
    private String changedByName;

    // Từ ai →
    @Column(name = "old_assignee_id")
    private Long oldAssigneeId;

    @Column(name = "old_assignee_name", length = 200)
    private String oldAssigneeName;

    // → sang ai
    @Column(name = "new_assignee_id")
    private Long newAssigneeId;

    @Column(name = "new_assignee_name", length = 200)
    private String newAssigneeName;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
    @Column(name = "changed_by_username", length = 100)
    private String changedByUsername;

    @Column(name = "old_assignee_username", length = 100)
    private String oldAssigneeUsername;

    @Column(name = "new_assignee_username", length = 100)
    private String newAssigneeUsername;
    @PrePersist
    public void prePersist() {
        if (changedAt == null) changedAt = LocalDateTime.now();
    }
}
