package server.repositories;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import server.models.CashAdvanceRequest;
import server.models.enums.CashAdvanceStatus;

import java.util.Collection;
import java.util.List;

public interface CashAdvanceRequestRepository
        extends JpaRepository<CashAdvanceRequest, Long>, JpaSpecificationExecutor<CashAdvanceRequest> {

    List<CashAdvanceRequest> findByCreatedBy_IdOrderByIdDesc(Long accountId);
    List<CashAdvanceRequest> findByStatusOrderByIdDesc(CashAdvanceStatus status);

    // Pending cho Chief (không lọc assignee)
    List<CashAdvanceRequest> findByStatusAndSentToChiefAtIsNotNullAndChiefApprovedAtIsNullOrderByIdDesc(
            CashAdvanceStatus status
    );

    // Pending cho Director (không lọc assignee)
    List<CashAdvanceRequest> findByStatusAndSentToDirectorAtIsNotNullAndDirectorApprovedAtIsNullOrderByIdDesc(
            CashAdvanceStatus status
    );

    // Pending cho Chief theo assignee
    List<CashAdvanceRequest>
    findByStatusAndSentToChiefAtIsNotNullAndChiefApprovedAtIsNullAndChiefAssignee_IdOrderByIdDesc(
            CashAdvanceStatus status, Long chiefAssigneeId
    );

    // Pending cho Director theo assignee
    List<CashAdvanceRequest>
    findByStatusAndSentToDirectorAtIsNotNullAndDirectorApprovedAtIsNullAndDirectorAssignee_IdOrderByIdDesc(
            CashAdvanceStatus status, Long directorAssigneeId
    );

    @Query("select count(c) from CashAdvanceRequest c where function('YEAR', c.createdAt) = :y")
    long countByCreatedYear(@Param("y") int year);

    List<CashAdvanceRequest> findAllByOrderByIdDesc();
    List<CashAdvanceRequest> findByStatusInOrderByIdDesc(Collection<CashAdvanceStatus> statuses);
    List<CashAdvanceRequest> findByCreatedBy_IdAndStatusInOrderByIdDesc(
            Long createdById, Collection<CashAdvanceStatus> statuses
    );


    List<CashAdvanceRequest> findByStatusInOrderByIdDesc(Collection<CashAdvanceStatus> statuses, Pageable pageable);

    @EntityGraph(attributePaths = {"task", "task.phase", "task.phase.project", "createdBy", "approvedBy", "chiefAssignee", "directorAssignee"})
    List<CashAdvanceRequest> findByStatusOrderByIdDesc(CashAdvanceStatus status, Pageable pageable);
}
