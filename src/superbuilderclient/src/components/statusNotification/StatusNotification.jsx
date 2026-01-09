import React, { useEffect } from "react";
import { Snackbar, Alert } from "@mui/material";
import useAppStore from "../../stores/AppStore";

const StatusNotification = () => {
  const notification = useAppStore((state) => state.notification);
  const clearNotification = useAppStore((state) => state.clearNotification);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    clearNotification();
  };

  useEffect(() => {
    if (notification) {
      // Use custom timeout if provided, otherwise use default based on type
      const timeout =
        notification.timeout !== null
          ? notification.timeout
          : notification.type === "error"
          ? 10000
          : 6000;

      const timer = setTimeout(() => {
        clearNotification();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  return (
    <Snackbar
      data-testid="status-notification-snackbar"
      open={!!notification}
      autoHideDuration={null}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      sx={{
        mt: 4,
      }}
    >
      <Alert
        onClose={handleClose}
        severity={notification.type}
        sx={{
          width: "100%",
          maxWidth: 400,
          whiteSpace: "pre-line", // Preserve line breaks
        }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default StatusNotification;
