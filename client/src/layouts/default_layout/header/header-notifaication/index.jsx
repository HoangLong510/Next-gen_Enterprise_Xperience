import React, { useState, useEffect, useCallback } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  ListItemText,
  Button,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useSnackbar } from "notistack";
import {
  fetchNotificationsApi,
  markNotificationAsRead,
} from "~/services/notification.service";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNotificationRealtime } from "~/hooks/useNotificationRealtime";

export default function HeaderNotification() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const account = useSelector((state) => state.account.value);
  const { enqueueSnackbar } = useSnackbar();

  // Callback để xử lý notification mới realtime
  const handleNewNotification = useCallback(
    (newNoti) => {
      setNotifications((prev) => [newNoti, ...prev].slice(0, 5));
      if (!newNoti.read) {
        setTotalUnread((prevTotal) => prevTotal + 1);
      }
      enqueueSnackbar(`Bạn vừa nhận công văn mới: ${newNoti.title}`, {
        variant: "info",
        persist: false,
        autoHideDuration: 5000,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
        preventDuplicate: true,
        action: (key) => (
          <Button
            onClick={() => {
              navigate(`/management/documents/${newNoti.referenceId}`);
              enqueueSnackbar.closeSnackbar(key);
            }}
            color="inherit"
            size="small"
            sx={{ textTransform: "none" }}
          >
            Xem chi tiết
          </Button>
        ),
        onClick: () => {
          if (newNoti.referenceId) {
            navigate(`/management/documents/${newNoti.referenceId}`);
          }
        },
      });
    },
    [enqueueSnackbar, navigate]
  );

  useEffect(() => {
    if (account.username) {
      fetchNotificationsApi(account.username).then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          // chỉ cập nhật số chưa đọc thôi, không set notifications
          setTotalUnread(res.data.filter((n) => !n.read).length);
        }
      });
    }
  }, [account.username]);

  // Lấy 5 thông báo mới nhất khi mở menu
  useEffect(() => {
    if (open && account.username) {
      fetchNotificationsApi(account.username).then((res) => {
        if (res.status === 200 && Array.isArray(res.data)) {
          setNotifications(res.data.slice(0, 5));
          setTotalUnread(res.data.filter((n) => !n.read).length);
        }
      });
    }
  }, [open, account.username]);

  // Kết nối websocket nhận realtime notification
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
      alert("Thông báo này không liên kết tới công văn!");
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
    navigate(`/management/documents/${noti.referenceId}`);
  };

  return (
    <>
      <IconButton color="primary" onClick={handleClick}>
        <Badge
          badgeContent={totalUnread > 0 ? totalUnread : null}
          color="error"
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              minWidth: 340,
              borderRadius: 3,
              p: 1,
              mt: 1.5,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, fontWeight: 600 }}>Thông báo</Box>
        {notifications.length === 0 ? (
          <Box
            sx={{ px: 2, py: 3, color: "text.secondary", textAlign: "center" }}
          >
            Không có thông báo mới
          </Box>
        ) : (
          notifications.map((noti) => (
            <MenuItem
              key={noti.id}
              sx={{
                alignItems: "flex-start",
                bgcolor: !noti.read ? "rgba(24,144,255,0.08)" : "unset",
              }}
              onClick={() => handleItemClick(noti)}
            >
              <ListItemText
                primary={
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: !noti.read ? 700 : 400,
                      fontSize: 15,
                      mb: 0.3,
                    }}
                  >
                    {noti.title}
                  </Typography>
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
                      }}
                    >
                      {noti.content}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: "#888", mt: 0.5, display: "block" }}
                    >
                      {new Date(noti.createdAt).toLocaleString()}
                    </Typography>
                  </>
                }
              />
            </MenuItem>
          ))
        )}
        <Box
          sx={{
            py: 1,
            px: 2,
            borderTop: "1px solid #eee",
            textAlign: "center",
          }}
        >
          <Button fullWidth size="small" variant="text" onClick={handleViewAll}>
            Xem tất cả thông báo
          </Button>
        </Box>
      </Menu>
    </>
  );
}
