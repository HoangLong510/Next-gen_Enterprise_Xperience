package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.TaskSize;
import server.models.enums.TaskStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

<<<<<<< Updated upstream
    private String description;

    private String imageUrl;

    @Enumerated(EnumType.STRING)
    private TaskSize size;
=======
    @Column(columnDefinition = "TEXT")
    private String description; // Mô tả task
    @Enumerated(EnumType.STRING) // 👈 mới thêm
    private TaskSize size;        // 👈 mới thêm
>>>>>>> Stashed changes
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private TaskStatus status;
    @ManyToOne
    @JoinColumn(name = "phase_id")
    private Phase phase;


    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private Employee assignee;

    // GitHub branch info (moved từ SubTask sang Task)
    private String githubBranch;
    private boolean branchCreated;

    // Pull Request info
    private String pullRequestUrl;
    private boolean merged;
    private LocalDateTime mergedAt;

    @Column(nullable = false)
    private boolean hidden = false;
}
