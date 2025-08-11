package server.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "task_order", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","task_id"}))
public class TaskOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Account user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    /**
     * Vị trí (index) trong cột Kanban của user này (càng nhỏ càng nằm trên)
     */
    @Column(nullable = false)
    private Integer position;
}
