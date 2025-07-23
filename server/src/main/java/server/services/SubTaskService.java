package server.services;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import server.models.SubTask;
import server.models.enums.SubTaskStatus;
import server.repositories.SubTaskRepository;
import server.utils.ApiResponse;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubTaskService {

    private final SubTaskRepository subTaskRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Đánh dấu SubTask là đã được merge nếu tìm thấy theo branch name.
     */
    public ApiResponse<?> markSubTaskAsMerged(String branchName, String prUrl, LocalDateTime mergedAt) {
        SubTask subTask = subTaskRepository.findByGithubBranch(branchName);

        if (subTask == null) {
            return ApiResponse.notfound("SubTask không tồn tại với branch: " + branchName);
        }

        if (subTask.isMerged()) {
            return ApiResponse.success(null, "SubTask đã được merge trước đó: " + branchName);
        }

        subTask.setMerged(true);
        subTask.setMergedAt(mergedAt);
        subTask.setPullRequestUrl(prUrl);
        subTask.setStatus(SubTaskStatus.COMPLETED);
        subTaskRepository.save(subTask);

        return ApiResponse.success(null, "✅ SubTask đã được cập nhật: " + branchName);
    }

    /**
     * Polling: kiểm tra các SubTask đang REVIEW xem PR đã merge chưa.
     */
    public void checkMergedPullRequests() {
        List<SubTask> reviewSubTasks = subTaskRepository.findByStatus(SubTaskStatus.REVIEW);
        System.out.println("🔍 Số lượng SubTask REVIEW: " + reviewSubTasks.size());

        for (SubTask subTask : reviewSubTasks) {
            String branch = subTask.getGithubBranch();
            System.out.println("➡️ Đang xử lý SubTask ID: " + subTask.getId() + " | Branch: " + branch);

            var project = subTask.getTask().getProject();
            String repoOwner = project.getRepoOwner();
            String repoName = project.getRepoName();
            System.out.println("📦 Repo: " + repoOwner + "/" + repoName);

            var tokenEntity = project.getProjectManager().getGitHubToken();
            if (tokenEntity == null) {
                System.err.println("❌ Không tìm thấy token cho project: " + project.getName());
                continue;
            }

            String accessToken = tokenEntity.getAccessToken();
            System.out.println("🔑 Token: " + (accessToken != null ? "Có" : "Không có"));

            Optional<PullRequestInfo> prInfo = findLatestMergedPR(repoOwner, repoName, branch, accessToken);

            if (prInfo.isEmpty()) {
                System.out.println("ℹ️ Không tìm thấy PR đã merge cho branch: " + branch);
            } else {
                System.out.println("✅ Tìm thấy PR đã merge: " + prInfo.get().htmlUrl());
                markSubTaskAsMerged(branch, prInfo.get().htmlUrl(), prInfo.get().mergedAt());
            }
        }
    }

    /**
     * Gọi GitHub API để tìm PR mới nhất đã merge của branch.
     */
    private Optional<PullRequestInfo> findLatestMergedPR(String owner, String repo, String branch, String token) {
        String url = String.format(
                "https://api.github.com/repos/%s/%s/pulls?state=closed&sort=updated&direction=desc&per_page=100",
                owner, repo
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-GitHub-Api-Version", "2022-11-28"); // optional but good practice

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);
            List<Map<String, Object>> prs = response.getBody();

            if (prs == null || prs.isEmpty()) {
                System.out.println("⚠️ Không có PR nào được trả về từ GitHub.");
                return Optional.empty();
            }

            return prs.stream()
                    .filter(pr -> pr.get("merged_at") != null)
                    .filter(pr -> {
                        Map<String, Object> head = (Map<String, Object>) pr.get("head");
                        String ref = (String) head.get("ref");
                        System.out.printf("🔍 So sánh branch: [API: %s] vs [Local: %s]%n", ref, branch);
                        return branch.equalsIgnoreCase(ref);
                    })
                    .max(Comparator.comparing(pr -> OffsetDateTime.parse((String) pr.get("updated_at"))))
                    .map(pr -> {
                        String htmlUrl = (String) pr.get("html_url");
                        LocalDateTime mergedAt = OffsetDateTime.parse((String) pr.get("merged_at")).toLocalDateTime();
                        System.out.println("✅ PR match: " + htmlUrl + " | merged_at: " + mergedAt);
                        return new PullRequestInfo(htmlUrl, mergedAt);
                    });

        } catch (Exception e) {
            System.err.println("❌ Lỗi khi gọi GitHub API: " + e.getMessage());
            return Optional.empty();
        }
    }


    /**
     * Record đơn giản chứa thông tin PR đã merge.
     */
    private record PullRequestInfo(String htmlUrl, LocalDateTime mergedAt) {}
}