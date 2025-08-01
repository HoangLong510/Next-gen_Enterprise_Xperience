package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.ProjectPriority;
import server.models.enums.ProjectStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    private LocalDate createdAt;
    private LocalDate deadline;
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    private ProjectStatus status;

    @Enumerated(EnumType.STRING)
    private ProjectPriority priority;

    @OneToOne
    @JoinColumn(name = "document_id")
    private Document document;

    @ManyToOne
    @JoinColumn(name = "pm_id")
    private Account projectManager;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks;

    @ManyToMany
    @JoinTable(
            name = "project_employees",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "employee_id")
    )
    private List<Employee> employees;

    @Column(nullable = false)
    private boolean hidden = false;

    // GitHub repository info
    private String repoLink;
    private String repoOwner;
    private String repoName;
    private String defaultBranch;
}