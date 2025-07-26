package server.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import server.models.enums.Gender;
import java.util.Arrays;


import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Data
@AllArgsConstructor
@NoArgsConstructor
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

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public String generateCode() {
        if (this.department == null || this.dateBirth == null) return null;

        final String taxCodeSuffix = "8465";
        String deptInitial = getInitials(this.department.getName());
        String nameInitial = getInitials(this.getLastName() + " " + this.getFirstName());

        int deptNumeric = deptInitial.chars().sum();
        int nameNumeric = nameInitial.chars().sum();

        int year = this.dateBirth.getYear();
        String yearSuffix = String.valueOf(year).substring(2);

        return taxCodeSuffix + "D" + deptNumeric + "N" + nameNumeric + "Y" + yearSuffix;
    }

    private String getInitials(String phrase) {
        return Arrays.stream(phrase.trim().split("\\s+"))
                .filter(word -> !word.isEmpty())
                .map(word -> word.substring(0, 1).toUpperCase())
                .reduce("", String::concat);
    }
}
