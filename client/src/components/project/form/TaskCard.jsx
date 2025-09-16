import React from "react";
import { Card, CardContent, Typography, Chip, Stack, Box } from "@mui/material";
import { CalendarToday } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatStatus, getStatusColor, isOverdue } from "~/utils/project.utils";

const CARD_HEIGHT = 128;

export default function TaskCard({ project, onTitleClick, disabled = false }) {
  const { t } = useTranslation("project", { useSuspense: false });
  if (!project) return null;

  const safeT = React.useCallback(
    (key, opts, fallback) => {
      const v = t(key, opts);
      return v && v !== key ? v : fallback;
    },
    [t]
  );

  const handleTitleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    onTitleClick?.(project);
  };
  const stopForDnd = (e) => e.stopPropagation();

  const overdue = isOverdue(project.deadline);
  const statusColorKey = getStatusColor(project.status);

  const statusLabel = React.useMemo(() => {
    return safeT(`statusLabel.${project.status}`, undefined, formatStatus(project.status));
  }, [project.status, safeT]);

  const sizeLabel = project.size
    ? safeT("sizeLabel", { value: project.size }, `Size: ${project.size}`)
    : null;

  const deadlineLabel = safeT("deadlineLabel", undefined, "Deadline");
  const deadlineTitle = project.deadline ? `${deadlineLabel}: ${project.deadline}` : "";

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: "100%",
        height: CARD_HEIGHT,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        transition: "box-shadow .2s ease, transform .2s ease",
        ...(disabled
          ? { opacity: 0.7, cursor: "not-allowed" }
          : { "&:hover": { boxShadow: 4, transform: "translateY(-1px)" } }),
        display: "flex",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <CardContent
        sx={{
          p: 2,
          pt: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          width: "100%",
          minWidth: 0,
        }}
      >
        {/* Header */}
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
            noWrap
            sx={{
              cursor: disabled ? "not-allowed" : "pointer",
              ...(disabled ? {} : { "&:hover": { textDecoration: "underline" } }),
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {project.name}
          </Typography>

          <Chip
            label={statusLabel}
            size="small"
            color={statusColorKey}
            sx={{ pointerEvents: "none", justifySelf: "end" }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Meta */}
        <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" minWidth={0}>
          {project.size && (
            <Chip label={sizeLabel} size="small" variant="outlined" sx={{ pointerEvents: "none" }} />
          )}

          {project.deadline && (
            <Box display="flex" alignItems="center" gap={0.5} minWidth={0}>
              <CalendarToday sx={{ fontSize: 14, color: overdue ? "error.main" : "text.secondary" }} />
              <Typography
                variant="caption"
                color={overdue ? "error.main" : "text.secondary"}
                noWrap
                title={deadlineTitle}
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
