
        package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import server.models.Task;
import server.models.TaskOrder;
import server.models.Account;
import server.models.enums.TaskStatus;
import server.models.Phase;
import server.repositories.TaskOrderRepository;
import server.repositories.AccountRepository;
import server.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Optional;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class TaskOrderService {

    private final TaskOrderRepository orderRepository;
    private final JwtUtil jwtUtil;
    private final AccountRepository accountRepository;

    /**
     * Cập nhật thứ tự task trong một cột Kanban (theo status) sau khi user kéo-thả.
     * @param orderedTaskIds Danh sách ID task theo thứ tự mong muốn (index 0 = vị trí top)
     * @param authHeader Chuỗi header Authorization ("Bearer <token>")
     */
    @Transactional
    public void updateOrder(List<Long> orderedTaskIds, String authHeader) {
        String token = authHeader.replaceFirst("^Bearer\\s+", "");
        String username = jwtUtil.extractUsername(token);
        Account user = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        for (int i = 0; i < orderedTaskIds.size(); i++) {
            Long taskId = orderedTaskIds.get(i);
            TaskOrder taskOrder = orderRepository.findByUserIdAndTaskId(user.getId(), taskId)
                    .orElseGet(() -> {
                        TaskOrder to = new TaskOrder();
                        to.setUser(user);
                        Task t = new Task(); t.setId(taskId);
                        to.setTask(t);
                        return to;
                    });
            taskOrder.setPosition(i);
            orderRepository.save(taskOrder);
        }
    }

    /**
     * Sắp xếp danh sách tasks theo thứ tự đã lưu của user. Nếu user chưa có order cho task,
     * thì đặt position = Integer.MAX_VALUE để đẩy xuống cuối.
     */
    public List<Task> sortTasksByUserOrder(List<Task> tasks, String authHeader) {
        String token = authHeader.replaceFirst("^Bearer\\s+", "");
        String username = jwtUtil.extractUsername(token);
        Account user = accountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("invalid-account"));

        // Load tất cả TaskOrder của user, sắp xếp theo position
        Map<Long, Integer> positionMap = orderRepository.findByUserIdOrderByPosition(user.getId()).stream()
                .collect(Collectors.toMap(
                        o -> o.getTask().getId(),
                        TaskOrder::getPosition
                ));

        // Sort tasks: trước theo status ordinal, sau theo saved position
        return tasks.stream()
                .sorted(Comparator
                        .comparing((Task t) -> t.getStatus().ordinal())
                        .thenComparingInt(t -> positionMap.getOrDefault(t.getId(), Integer.MAX_VALUE))
                )
                .collect(Collectors.toList());
    }
}

