package server.repositories;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import server.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("SELECT n FROM Notification n JOIN FETCH n.recipient WHERE n.recipient.username = :username ORDER BY n.createdAt DESC")
    List<Notification> findByRecipientUsernameWithJoinFetch(@Param("username") String username);
}
