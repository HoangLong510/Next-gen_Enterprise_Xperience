package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.TaskStatus;

import java.time.LocalDate;
import java.util.List;

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

    private String description; // 🆕 Mô tả task

    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    private TaskStatus status;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubTask> subTasks;

    @Column(nullable = false)
    private boolean hidden = false;

    // GitHub repository info
    private String repoLink;
    private String repoOwner;
    private String repoName;
    private String defaultBranch;
}