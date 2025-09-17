import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
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
  // ✅ callback kiểm tra lock DRAG theo phase ("khóa chuỗi")
  isTaskLocked = () => false,
  // ✅ callback kiểm tra lock CLICK (ví dụ EMP/HOD không cho mở COMPLETED)
  isTaskClickDisabled = () => false,
}) {
  const { t, i18n } = useTranslation("project");

  const localizedTitle = React.useMemo(() => {
    if (title) return title;
    const key = `statusLabel.${id}`;
    const out = t(key);
    return out === key ? id : out;
  }, [title, id, t, i18n.language]);

  const { setNodeRef } = useDroppable({ id, disabled: droppableDisabled });
  const paletteKey = getStatusColor(id) || "default";

  return (
    <Paper
      ref={setNodeRef}
      role="region"
      aria-label={t("kanban.aria.column", { title: localizedTitle })}
      sx={(theme) => ({
        width: "100%",
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
          variant="subtitle1"
          sx={{ fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.2 }}
          title={localizedTitle}
        >
          {localizedTitle}
        </Typography>

        {/* badge đếm */}
        <Box
          aria-label={t("kanban.aria.itemsCount", { count: projects.length })}
          sx={(theme) => ({
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 800,
            lineHeight: 1,
            backgroundColor: "transparent",
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            minWidth: 34,
            textAlign: "center",
          })}
        >
          {projects.length}
        </Box>
      </Stack>

      {/* list + placeholder (visual only) */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 0.5 }}>
        {projects.map((project, index) => (
          <SortableTaskCard
            key={project.id}
            id={String(project.id)}
            project={project}
            containerId={id}
            onOpenTask={onOpenTask}
            over={overColumn === id && overIndex === index}
            activeId={activeId}
            dragDisabled={isTaskLocked(project)}               // ✅ disable DRAG theo phase
            clickDisabled={isTaskClickDisabled(project)}       // ✅ disable CLICK theo role/status
          />
        ))}

        <ColumnPlaceholder showBorder={overColumn === id && overIndex === projects.length} />
      </Box>
    </Paper>
  );
}

function ColumnPlaceholder({ showBorder }) {
  return (
    <div
      style={{
        height: 42,
        marginTop: 4,
        border: showBorder ? "2px dashed #1976d2" : "2px dashed transparent",
        borderRadius: 6,
        transition: "border .18s ease",
      }}
    />
  );
}

function SortableTaskCard({
  id,
  project,
  containerId,
  onOpenTask,
  over,
  activeId,
  dragDisabled = false,
  clickDisabled = false,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    data: { project, sortable: { containerId } },
    disabled: dragDisabled, // ✅ dnd-kit: chỉ khoá DRAG
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: id === activeId ? 0 : 1,
    ...(clickDisabled ? { cursor: "not-allowed", pointerEvents: "auto" } : {}),
  };

  const handleClick = () => {
    if (clickDisabled) return; // ✅ chặn mở dialog khi clickDisabled
    onOpenTask?.(project);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!dragDisabled ? attributes : {})}
      {...(!dragDisabled ? listeners : {})}
      onClick={handleClick}
    >
      <TaskCard project={project} onTitleClick={handleClick} disabled={clickDisabled} />
    </div>
  );
}

export default React.memo(KanbanColumn);
