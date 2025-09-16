// src/components/project/form/AssignmentHistoryDialog.jsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { getAssignmentLogsByTask } from "~/services/task-assign-log.service";

export default function AssignmentHistoryDialog({ open, taskId, onClose }) {
  // ✅ ĐÚNG namespace với file task.json
  const { t } = useTranslation("task");

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !taskId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await getAssignmentLogsByTask(taskId);
        const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setLogs(arr);
      } catch (err) {
        console.error("Failed to load assignment logs", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, taskId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <HistoryIcon fontSize="small" sx={{ mr: 1, verticalAlign: "middle" }} />
        {t("assignment-history")}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : logs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("no-history-available")}
          </Typography>
        ) : (
          <List>
            {logs.map((log) => (
              <ListItem key={log.id} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar>
                    <HistoryIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <strong>{log.changedByName}</strong>
                      {log.changedByUsername ? ` (@${log.changedByUsername})` : ""}{" "}
                      {t("changed-assignee")}{" "}
                      {log.oldAssigneeName ? (
                        <>
                          {t("from")} <strong>{log.oldAssigneeName}</strong>
                          {log.oldAssigneeUsername ? ` (@${log.oldAssigneeUsername})` : ""}{" "}
                        </>
                      ) : (
                        <>
                          {t("from")} {t("none")}{" "}
                        </>
                      )}
                      {t("to-sep")} <strong>{log.newAssigneeName}</strong>
                      {log.newAssigneeUsername ? ` (@${log.newAssigneeUsername})` : ""}
                    </Typography>
                  }
                  secondary={dayjs(log.changedAt).format("YYYY-MM-DD HH:mm:ss")}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
