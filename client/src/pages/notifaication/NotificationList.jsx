"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Paper,
  Card,
  CardContent,
  Badge,
  Chip,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Notifications,
  Description,
  Event,
  Work,
  Assignment,
  ShoppingCart,
  AccessTime,
  Circle,
  Visibility,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  fetchNotificationsApi,
  markNotificationAsRead,
} from "~/services/notification.service";
import CustomAvatar from "~/components/custom-avatar";
import { useTranslation } from "react-i18next";

const getTypeIcon = (type) => {
  switch (type) {
    case "DOCUMENT":
      return <Description />;
    case "LEAVE_REQUEST":
      return <Event />;
    case "PROJECT":
      return <Work />;
    case "TASK":
      return <Assignment />;
    case "ORDER":
      return <ShoppingCart />;
    case "ATTENDANCE":
      return <AccessTime />;
    default:
      return <Notifications />;
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
      return "Notifaications";
  }
};

export default function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const account = useSelector((state) => state.account.value);
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation("noti_page");

  useEffect(() => {
    async function loadNotifications() {
      if (!account?.username) return;
      setLoading(true);
      const res = await fetchNotificationsApi(account.username);
      if (res.status === 200 && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
      setLoading(false);
    }
    loadNotifications();
  }, [account?.username]);

  const navigateToDetail = (noti) => {
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
        navigate(`/management/tasks/${noti.referenceId}`);
        break;
      case "ORDER":
        navigate(`/management/orders/${noti.referenceId}`);
        break;
      case "ATTENDANCE":
        navigate(`/attendance/${noti.referenceId}`);
        break;
      case "CASH_ADVANCE":
        navigate(`/payment-request`);
        break;
      default:
        navigate("/notifications");
    }
  };

  const handleItemClick = async (noti) => {
    if (!noti.referenceId) {
      alert("This notice does not link to details!");
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
      }
    }
    navigateToDetail(noti);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (notifications.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 10,
        }}
      >
        <Notifications sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography
          align="center"
          color="text.secondary"
          sx={{ fontSize: 22, fontWeight: 600 }}
        >
          {t("no-notifications")}
        </Typography>
      </Box>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.1
          )}, ${alpha(theme.palette.primary.light, 0.05)})`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <Notifications sx={{ fontSize: 32, color: "primary.main" }} />
            </Badge>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              {t("all-notifications")}
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread notification`}
              color="error"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>
      </Paper>

      {/* Notifications List */}
      <Stack spacing={2}>
        {notifications.map((noti, idx) => (
          <Card
            key={noti.id}
            elevation={noti.read ? 1 : 4}
            sx={{
              cursor: "pointer",
              transition: "all 0.3s ease",
              borderRadius: 3,
              border: noti.read
                ? `1px solid ${alpha(theme.palette.grey[300], 0.5)}`
                : `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              background: noti.read
                ? "background.paper"
                : `linear-gradient(135deg, ${alpha(
                    theme.palette.primary.main,
                    0.05
                  )}, ${alpha(theme.palette.primary.light, 0.02)})`,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 8px 25px ${alpha(
                  theme.palette.primary.main,
                  0.15
                )}`,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
            onClick={() => handleItemClick(noti)}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center", // căn giữa theo chiều dọc
                  gap: 2,
                }}
              >
                {/* Avatar */}
                <Box
                  sx={{
                    position: "relative",
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {noti.senderUsername === "System" ? (
                    <Box
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
                        borderRadius: 2,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src="/images/brand.png"
                        alt="Hệ thống"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </Box>
                  ) : (
                    <CustomAvatar
                      src={noti.senderAvatar}
                      alt={noti.senderUsername || noti.senderFullName || "User"}
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
                        fontSize: 16,
                        color: "error.main",
                      }}
                    />
                  )}
                </Box>

                {/* Nội dung thông báo */}
                <Box sx={{ flex: 1 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Chip
                      icon={getTypeIcon(noti.type)}
                      label={getTypeLabel(noti.type)}
                      color={getTypeColor(noti.type)}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(noti.createdAt).toLocaleString()}
                    </Typography>
                  </Stack>

                  <Typography
                    variant="h6"
                    fontWeight={noti.read ? 500 : 700}
                    color={noti.read ? "text.primary" : "primary.main"}
                    sx={{ mb: 1, lineHeight: 1.3 }}
                  >
                    {t(noti.title)}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.5,
                      mb: 2,
                    }}
                  >
                    {t(noti.content)}
                  </Typography>

                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      From: { noti.senderUsername || noti.senderFullName}
                    </Typography>
                    <Button
                      variant={noti.read ? "outlined" : "contained"}
                      size="small"
                      startIcon={<Visibility />}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        px: 2,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(noti);
                      }}
                    >
                      {t("see-details")}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
