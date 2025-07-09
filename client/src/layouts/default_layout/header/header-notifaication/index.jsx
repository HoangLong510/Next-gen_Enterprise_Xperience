import React, { useState, useEffect } from "react";
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
import { fetchNotificationsApi } from "~/services/notification.service"; // tự viết theo mẫu dưới
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNotificationRealtime } from "~/hooks/useNotificationRealtime";

export default function HeaderNotifaication() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  // Fetch 5 thông báo mới nhất khi mở dropdown
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);
  const account = useSelector((state) => state.account.value);
  useEffect(() => {
    // Lấy username từ local hoặc redux (giả sử đã login)
    if (open && account.username) {
      fetchNotificationsApi(account.username).then((res) => {
        // res.data là array notification, sort mới nhất lên đầu
        if (res.status === 200 && Array.isArray(res.data)) {
          setNotifications(res.data.slice(0, 5));
          setTotal(res.data.length);
        }
      });
    }
  }, [open]);

  const handleViewAll = () => {
    handleClose();
    navigate("/notifications");
  };

  useNotificationRealtime(account?.username, (newNoti) => {
    setNotifications((prev) => [newNoti, ...prev].slice(0, 5));
    setTotal((prevTotal) => prevTotal + 1);
  });

  return (
    <>
      <IconButton color="primary" onClick={handleClick}>
        <Badge badgeContent={total > 0 ? total : null} color="error">
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
        {notifications.length === 0 && (
          <Box
            sx={{ px: 2, py: 3, color: "text.secondary", textAlign: "center" }}
          >
            Không có thông báo mới
          </Box>
        )}
        {notifications.map((noti, idx) => (
          <MenuItem
            key={noti.id}
            sx={{
              alignItems: "flex-start",
              bgcolor: !noti.read ? "rgba(24,144,255,0.08)" : "unset",
            }}
            onClick={() => {
              handleClose();
              navigate(`/documents/${noti.referenceId}`);
            }}
          >
            <ListItemText
              primary={
                <Typography
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
                    variant="caption"
                    sx={{ color: "#888", mt: 0.5, display: "block" }}
                  >
                    {new Date(noti.createdAt).toLocaleString()}
                  </Typography>
                </>
              }
            />
          </MenuItem>
        ))}
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
