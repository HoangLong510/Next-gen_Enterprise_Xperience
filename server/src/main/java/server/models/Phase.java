package server.models;

import jakarta.persistence.*;
import lombok.*;
import server.models.enums.PhaseStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Phase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PhaseStatus status;  // NOT_STARTED, IN_PROGRESS, COMPLETED
    @Column(nullable = false)
    private Integer sequence;
    private LocalDateTime startedAt;

    @OneToMany(mappedBy = "phase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;
}
