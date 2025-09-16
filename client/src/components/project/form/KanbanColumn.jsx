// components/project/form/KanbanColumn.jsx
import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import { getStatusColor } from "~/utils/project.utils";

function KanbanColumn({
  id,
  title,
  projects,
  onOpenTask,
  overColumn,
  overIndex,
  activeId,
  droppableDisabled = false,
}) {
  const { setNodeRef } = useDroppable({ id, disabled: droppableDisabled });
  const placeholderId = `${id}-placeholder`;

  const paletteKey = getStatusColor(id) || "default";

  return (
    <Paper
      ref={setNodeRef}
      sx={(theme) => ({
        width: 300,
        minHeight: "100%",
        p: 1.25,
        borderRadius: 2,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        borderTop: "3px solid",
        borderTopColor:
          paletteKey === "default" ? theme.palette.divider : theme.palette[paletteKey]?.main,
        backgroundColor: droppableDisabled ? "#F8F9FB" : "#F3F4F6",
        opacity: droppableDisabled ? 0.6 : 1,
        transition: "transform .12s ease, box-shadow .12s ease",
        "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.12)" },
        display: "flex",
        flexDirection: "column",
      })}
    >
      {/* header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography
          variant="subtitle1"                 // ⬅️ lớn hơn subtitle2
          sx={{ fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.2 }}
        >
          {title}
        </Typography>

        {/* badge đếm: to hơn 1 chút, nền trong suốt */}
        <Box
          sx={(theme) => ({
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            fontSize: 13.5,                  // ⬅️ lớn hơn
            fontWeight: 800,
            lineHeight: 1,
            backgroundColor: "transparent",  // hoặc theme.palette.grey[100] nếu muốn
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            minWidth: 34,                    // ⬅️ rộng hơn nhẹ
            textAlign: "center",
          })}
        >
          {projects.length}
        </Box>
      </Stack>

      {/* list + placeholder */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 0.5 }}>
        {projects.map((project, index) => (
          <SortableTaskCard
            key={project.id}
            id={project.id}
            project={project}
            containerId={id}
            onOpenTask={onOpenTask}
            over={overColumn === id && overIndex === index}
            activeId={activeId}
          />
        ))}

        {/* placeholder cuối cột */}
        <SortableTaskCard
          key={placeholderId}
          id={placeholderId}
          project={null}
          containerId={id}
          isPlaceholder
          over={overColumn === id && overIndex === projects.length}
          activeId={activeId}
        />
      </Box>
    </Paper>
  );
}

function SortableTaskCard({
  id,
  project,
  containerId,
  onOpenTask,
  over,
  isPlaceholder = false,
  activeId,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: { project, sortable: { containerId } },
  });

  if (isPlaceholder) {
    return (
      <div
        ref={setNodeRef}
        style={{
          height: 42,
          marginTop: 4,
          border: over ? "2px dashed #1976d2" : "2px dashed transparent",
          borderRadius: 6,
          transition: "border .18s ease",
        }}
        {...attributes}
        {...listeners}
      />
    );
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: id === activeId ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard project={project} onTitleClick={() => onOpenTask(project)} />
    </div>
  );
}

export default React.memo(KanbanColumn);
