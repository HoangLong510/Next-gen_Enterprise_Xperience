package server.repositories;

import org.springframework.stereotype.Repository;
import server.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipient_UsernameOrderByCreatedAtDesc(String username);
}
