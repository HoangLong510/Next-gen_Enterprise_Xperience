import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  fetchNotificationsApi,
  markNotificationAsRead,
} from "~/services/notification.service";

export default function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const account = useSelector((state) => state.account.value);
  const navigate = useNavigate();

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

  // Hàm điều hướng theo loại thông báo
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
      default:
        navigate("/notifications");
    }
  };

  const handleItemClick = async (noti) => {
    if (!noti.referenceId) {
      alert("Thông báo này không liên kết tới chi tiết!");
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
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (notifications.length === 0) {
    return (
      <Typography
        align="center"
        color="text.secondary"
        sx={{ mt: 10, fontSize: 22, fontWeight: 600 }}
      >
        Không có thông báo nào.
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3} color="primary.main">
        Tất cả thông báo
      </Typography>
      <List>
        {notifications.map((noti, idx) => (
          <React.Fragment key={noti.id}>
            <ListItem
              button
              onClick={() => handleItemClick(noti)}
              sx={{
                bgcolor: noti.read ? "inherit" : "rgba(24,144,255,0.08)",
                alignItems: "flex-start",
              }}
            >
              <ListItemText
                primary={
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: noti.read ? 400 : 700 }}
                  >
                    {noti.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {noti.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#888", mt: 0.5, display: "block" }}
                    >
                      {new Date(noti.createdAt).toLocaleString()}
                    </Typography>
                  </>
                }
              />
              <Button
                variant="outlined"
                size="small"
                sx={{ ml: 2, alignSelf: "center", textTransform: "none" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(noti);
                }}
              >
                Xem chi tiết
              </Button>
            </ListItem>
            {idx < notifications.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
}
