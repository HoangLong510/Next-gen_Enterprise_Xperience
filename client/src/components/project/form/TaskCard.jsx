// src/components/project/form/TaskCard.jsx
import React from "react";
import { Card, CardContent, Typography, Chip, Stack, Box } from "@mui/material";
import { CalendarToday } from "@mui/icons-material";
import { formatStatus, getStatusColor, isOverdue } from "~/utils/project.utils";

const CARD_HEIGHT = 128;      // giữ đồng đều theo trục dọc
const TITLE_CLAMP = 2;

export default function TaskCard({ project, onTitleClick }) {
  if (!project) return null;

  const handleTitleClick = (e) => {
    e.stopPropagation();
    onTitleClick?.(project);
  };
  const stopForDnd = (e) => e.stopPropagation();

  const overdue = isOverdue(project.deadline);
  const statusColorKey = getStatusColor(project.status);

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: "100%",          // ⬅️ không cho nở ngang
        height: CARD_HEIGHT,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        transition: "box-shadow .2s ease, transform .2s ease",
        "&:hover": { boxShadow: 4, transform: "translateY(-1px)" },
        display: "flex",
        boxSizing: "border-box",   // ⬅️ ổn định kích thước
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: 3,
          pt: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          width: "100%",
          minWidth: 0,             // ⬅️ cho phép con co giãn đúng
        }}
      >
        {/* Header: Grid giữ chip cố định bên phải, title chiếm phần còn lại */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "start",
            columnGap: 1,
            minWidth: 0,
          }}
        >
          <Typography
            variant="body2"
            fontWeight={700}
            title={project.name}
            onClick={handleTitleClick}
            onMouseDown={stopForDnd}
            onPointerDown={stopForDnd}
            sx={{
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: TITLE_CLAMP,    // 2 dòng
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              // ⬇️ bẻ từ an toàn khi chuỗi không có khoảng trắng
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              whiteSpace: "normal",
            }}
          >
            {project.name}
          </Typography>

          <Chip
            label={formatStatus(project.status)}
            size="small"
            color={statusColorKey}
            sx={{ pointerEvents: "none", justifySelf: "end" }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Meta */}
        <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" minWidth={0}>
          {project.size && (
            <Chip
              label={`Size: ${project.size}`}
              size="small"
              variant="outlined"
              sx={{ pointerEvents: "none" }}
            />
          )}

          {project.deadline && (
            <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
              <CalendarToday sx={{ fontSize: 14, color: overdue ? "error.main" : "text.secondary" }} />
              <Typography
                variant="caption"
                color={overdue ? "error.main" : "text.secondary"}
                noWrap
                title={`Deadline: ${project.deadline}`}
              >
                {project.deadline}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
