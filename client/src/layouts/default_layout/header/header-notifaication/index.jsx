"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  ListItemText,
  Button,
  Chip,
  Stack,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Notifications,
  NotificationsActive,
  Circle,
  Description,
  Event,
  Work,
  Assignment,
  ShoppingCart,
  AccessTime,
  Visibility,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import {
  fetchNotificationsApi,
  markNotificationAsRead,
} from "~/services/notification.service";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNotificationRealtime } from "~/hooks/useNotificationRealtime";
import CustomAvatar from "~/components/custom-avatar";
import { useTranslation } from "react-i18next";

const getTypeIcon = (type) => {
  switch (type) {
    case "DOCUMENT":
      return <Description sx={{ fontSize: 16 }} />;
    case "LEAVE_REQUEST":
      return <Event sx={{ fontSize: 16 }} />;
    case "PROJECT":
      return <Work sx={{ fontSize: 16 }} />;
    case "TASK":
      return <Assignment sx={{ fontSize: 16 }} />;
    case "ORDER":
      return <ShoppingCart sx={{ fontSize: 16 }} />;
    case "ATTENDANCE":
      return <AccessTime sx={{ fontSize: 16 }} />;
    default:
      return <Notifications sx={{ fontSize: 16 }} />;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case "DOCUMENT":
      return "primary";
    case "LEAVE_REQUEST":
      return "success";
    case "PROJECT":
      return "warning";
    case "TASK":
      return "info";
    case "ORDER":
      return "secondary";
    case "ATTENDANCE":
      return "error";
    default:
      return "default";
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case "DOCUMENT":
      return "DOCUMENT";
    case "LEAVE_REQUEST":
      return "LEAVE_REQUEST";
    case "PROJECT":
      return "PROJECT";
    case "TASK":
      return "TASK";
    case "ORDER":
      return "ORDER";
    case "ATTENDANCE":
      return "ATTENDANCE";
    default:
      return "Notifaication";
  }
};

export default function HeaderNotification() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const account = useSelector((state) => state.account.value);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const theme = useTheme();
  const { t } = useTranslation("noti_page");

  const navigateToDetail = useCallback(
    (noti) => {
      if (!noti.referenceId) return;
      switch (noti.type) {
        case "DOCUMENT":
          navigate(`/management/documents/${noti.referenceId}`);
          break;
        case "LEAVE_REQUEST":
          navigate(`/leave-request`);
          break;
        case "PROJECT":
          navigate(`/management/projects/${noti.referenceId}`);
          break;
        case "TASK":
          const { projectId, phaseId } = JSON.parse(noti.content).params;
          navigate(`/projects/${projectId}/phase/${phaseId}/kanban`);
          break;
        case "ORDER":
          navigate(`/management/orders/${noti.referenceId}`);
          break;
        case "ATTENDANCE":
          navigate(`/attendance/${noti.referenceId}`);
          break;
        default:
          navigate("/notifications");
      }
    },
    [navigate]
  );

  function parseContent(content) {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  const handleNewNotification = useCallback(
    (newNoti) => {
      setNotifications((prev) => [newNoti, ...prev].slice(0, 5));
      if (!newNoti.read) {
        setTotalUnread((prevTotal) => prevTotal + 1);
      }
      enqueueSnackbar(`You have a new notification: ${newNoti.title}`, {
        variant: "info",
        persist: false,
        autoHideDuration: 5000,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
        preventDuplicate: true,
        action: (key) => (
          <Button
            onClick={() => {
              navigateToDetail(newNoti);
              closeSnackbar(key);
            }}
            color="inherit"
            size="small"
            sx={{ textTransform: "none" }}
          >
            View Details
          </Button>
        ),
        onClick: () => {
          navigateToDetail(newNoti);
        },
      });
    },
    [enqueueSnackbar, closeSnackbar, navigateToDetail]
  );

  useEffect(() => {
    if (account?.username) {
      fetchNotificationsApi(account.username).then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          setTotalUnread(res.data.filter((n) => !n.read).length);
        }
      });
    }
  }, [account?.username]);

  useEffect(() => {
    if (open && account?.username) {
      fetchNotificationsApi(account.username).then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          setNotifications(res.data.slice(0, 5));
          setTotalUnread(res.data.filter((n) => !n.read).length);
        }
      });
    }
  }, [open, account?.username]);

  useNotificationRealtime(account?.username, handleNewNotification);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleViewAll = () => {
    handleClose();
    navigate("/notifications");
  };

  const handleItemClick = async (noti) => {
    handleClose();
    if (!noti.referenceId) {
      alert("This notification does not link to details!");
      return;
    }
    if (!noti.read) {
      const res = await markNotificationAsRead(noti.id);
      if (res.status === 200) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === noti.id ? { ...item, read: true } : item
          )
        );
        setTotalUnread((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }
    navigateToDetail(noti);
  };

  return (
    <>
      <IconButton
        color="primary"
        onClick={handleClick}
        sx={{
          position: "relative",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.1)",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          },
        }}
      >
        <Badge
          badgeContent={totalUnread > 0 ? totalUnread : null}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.75rem",
              fontWeight: 600,
              animation: totalUnread > 0 ? "pulse 2s infinite" : "none",
            },
          }}
        >
          {totalUnread > 0 ? (
            <NotificationsActive sx={{ fontSize: 28 }} />
          ) : (
            <Notifications sx={{ fontSize: 28 }} />
          )}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              minWidth: 420,
              maxWidth: 450,
              borderRadius: 3,
              p: 0,
              mt: 1.5,
              boxShadow: `0 12px 24px ${alpha(
                theme.palette.primary.main,
                0.15
              )}`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Header */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: "white",
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Notifications sx={{ fontSize: 20 }} />
            <Typography variant="h6" fontWeight={600}>
              Notifications
            </Typography>
          </Stack>
          {totalUnread > 0 && (
            <Chip
              label={`${totalUnread} new`}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
          )}
        </Box>

        {/* Content */}
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
              <Notifications
                sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
              />
              <Typography color="text.secondary" variant="body2">
                No new notifications
              </Typography>
            </Box>
          ) : (
            notifications.map((noti, index) => (
              <Box key={noti.id}>
                <MenuItem
                  sx={{
                    alignItems: "flex-start",
                    px: 3,
                    py: 2,
                    minHeight: "auto",
                    background: !noti.read
                      ? `linear-gradient(135deg, ${alpha(
                          theme.palette.primary.main,
                          0.05
                        )}, ${alpha(theme.palette.primary.light, 0.02)})`
                      : "transparent",
                    border: !noti.read
                      ? `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                      : "none",
                    borderRadius: !noti.read ? 2 : 0,
                    mx: !noti.read ? 1 : 0,
                    my: !noti.read ? 0.5 : 0,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      transform: "translateX(4px)",
                    },
                    gap: 1.5,
                  }}
                  onClick={() => handleItemClick(noti)}
                >
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                    }}
                  >
                    {noti.senderUsername === "System" ? (
                      <img
                        src="/images/brand.png"
                        alt="Hệ thống"
                        style={{
                          width: 56,
                          height: 56,
                          border: `3px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                          boxShadow: `0 4px 12px ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                          borderRadius: 8,
                        }}
                      />
                    ) : (
                      <CustomAvatar
                        src={noti.senderAvatar}
                        alt={
                          noti.senderFullName || noti.senderUsername || "User"
                        }
                        sx={{
                          width: 56,
                          height: 56,
                          border: `3px solid ${alpha(
                            theme.palette.primary.main,
                            0.2
                          )}`,
                          boxShadow: `0 4px 12px ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        }}
                      />
                    )}

                    {!noti.read && (
                      <Circle
                        sx={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          fontSize: 14,
                          color: "error.main",
                        }}
                      />
                    )}
                  </Box>

                  <ListItemText
                    primary={
                      <Box>
                        {/* Type chip and time */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Chip
                            icon={getTypeIcon(noti.type)}
                            label={getTypeLabel(noti.type)}
                            color={getTypeColor(noti.type)}
                            size="small"
                            sx={{ fontSize: "0.7rem", height: 20 }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.7rem" }}
                          >
                            {new Date(noti.createdAt).toLocaleString()}
                          </Typography>
                        </Stack>

                        {/* Title */}
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: !noti.read ? 700 : 400,
                            fontSize: 15,
                            mb: 0.3,
                            color: !noti.read ? "primary.main" : "text.primary",
                            display: "block",
                          }}
                        >
                          {t(noti.title)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          sx={{
                            color: "text.secondary",
                            fontSize: 13,
                            maxWidth: 260,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                            mb: 0.5,
                          }}
                        >
                          {(() => {
                            const parsed = parseContent(noti.content);
                            return parsed?.key
                              ? t(parsed.key, parsed.params || {})
                              : noti.content;
                          })()}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: "#888",
                            mt: 0.5,
                            display: "block",
                            fontSize: "0.7rem",
                          }}
                        >
                          From: {noti.senderUsername || noti.senderFullName}
                        </Typography>
                      </>
                    }
                  />

                  {/* Action indicator */}
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Visibility
                      sx={{ fontSize: 16, color: "text.secondary" }}
                    />
                  </Box>
                </MenuItem>
                {index < notifications.length - 1 && <Divider sx={{ mx: 2 }} />}
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            p: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Button
            fullWidth
            size="small"
            variant="text"
            onClick={handleViewAll}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              py: 1,
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            {t("all-notifications")}
          </Button>
        </Box>
      </Menu>

      <style>
        {`
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `}
      </style>
    </>
  );
}
