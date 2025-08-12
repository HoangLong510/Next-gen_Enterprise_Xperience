package server.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import server.models.enums.Gender;
import java.util.Arrays;


import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "employees")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true)
    private String code;


    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String address;

    private String avatar;

    @Column(nullable = false)
    private LocalDate dateBirth;

    @Enumerated(value = EnumType.STRING)
    @Column(nullable = false)
    private Gender gender;

    //quan
    @ManyToOne
    @JoinColumn(name = "position_id")
    private Position position;
    //het

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "account_id")
    @JsonIgnoreProperties("employee")
    private Account account;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @OneToOne(mappedBy = "hod")
    @JsonIgnoreProperties("hod")
    private Department hodDepartment;

    @ManyToMany(mappedBy = "employees")
    private List<Project> projects;

    // Thay subTasks bằng tasks
    @OneToMany(mappedBy = "assignee")
    private List<Task> tasks;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public String generateCode() {
        if (this.phone == null || this.dateBirth == null) return null;

        String phoneSuffix = phone.length() >= 4 ? phone.substring(phone.length() - 4) : phone;

        String yearSuffix = String.valueOf(this.dateBirth.getYear()).substring(2);

        return phoneSuffix + yearSuffix;
    }
}
