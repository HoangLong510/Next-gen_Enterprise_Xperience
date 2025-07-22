package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.SubTaskStatus;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private Employee assignee;

    @Enumerated(EnumType.STRING)
    private SubTaskStatus status;

    @ManyToOne
    @JoinColumn(name = "task_id")
    private Task task;

    // ✅ GitHub Branch Info
    private String githubBranch;
    private boolean branchCreated;

    // ✅ Pull Request Info
    private String pullRequestUrl;
    private boolean merged;
    private LocalDateTime mergedAt;
}