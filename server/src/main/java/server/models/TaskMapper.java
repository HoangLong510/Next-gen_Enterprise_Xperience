package server.models;

import server.dtos.TaskDto;
import server.models.Task;

public class TaskMapper {

    public static TaskDto toDto(Task task) {
        if (task == null) return null;

        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setName(task.getName());
        dto.setDescription(task.getDescription());
        dto.setImageUrl(task.getImageUrl());
        dto.setDeadline(task.getDeadline());
        dto.setStatus(task.getStatus() != null ? task.getStatus().name() : null);
        dto.setSize(task.getSize() != null ? task.getSize().name() : null);
        dto.setHidden(task.isHidden());

        if (task.getPhase() != null) {
            dto.setPhaseId(task.getPhase().getId());
        }

        if (task.getAssignee() != null) {
            var a = task.getAssignee();
            dto.setAssigneeId(a.getId());
            dto.setAssigneeName((a.getFirstName() + " " + a.getLastName()).trim());
            dto.setAssigneeUsername(
                    a.getAccount() != null ? a.getAccount().getUsername() : null
            );
        }

        dto.setGithubBranch(task.getGithubBranch());
        dto.setBranchCreated(task.isBranchCreated());
        dto.setPullRequestUrl(task.getPullRequestUrl());
        dto.setMerged(task.isMerged());
        dto.setMergedAt(task.getMergedAt());

        return dto;
    }
}