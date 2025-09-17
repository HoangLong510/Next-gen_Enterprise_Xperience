import React, { useRef, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  checkInFaceApi,
  checkOutFaceApi,
  getAttendanceTodayStatusApi,
} from "~/services/attendance.service"; // Thêm checkOut và status mới
import { setPopup } from "~/libs/features/popup/popupSlice";

export default function FaceCameraVerify() {
  const theme = useTheme();
  const dispatch = useDispatch();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [imageBlob, setImageBlob] = useState(null);
  const [loading, setLoading] = useState(false);

  // Trạng thái chấm công hôm nay: "NOT_CHECKED_IN", "CHECKED_IN", "CHECKED_OUT"
  const [attendanceStatus, setAttendanceStatus] = useState("NOT_CHECKED_IN");

  const account = useSelector((state) => state.account.value);
  const accountId = account?.id;

  useEffect(() => {
    if (!accountId) return;

    async function fetchAttendanceStatus() {
      try {
        // Gọi API mới trả về trạng thái hôm nay
        const status = await getAttendanceTodayStatusApi(accountId);
        setAttendanceStatus(status);

        if (status === "NOT_CHECKED_IN" || status === "CHECKED_IN") {
          startCamera();
        } else {
          stopCamera();
        }
      } catch (error) {
        dispatch(
          setPopup({
            type: "error",
            message: "Failed to fetch attendance status",
          })
        );
      }
    }

    fetchAttendanceStatus();

    return () => stopCamera();
  }, [accountId, dispatch]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera error:", e);
      dispatch(
        setPopup({
          type: "error",
          message: e.message || "Cannot access camera",
        })
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (attendanceStatus === "CHECKED_OUT") return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          setImageBlob(file); // gửi lên API sẽ có content-type chuẩn
        }
      },
      "image/jpeg",
      0.95
    );
  };

  const submitCheckIn = () => {
    if (attendanceStatus !== "NOT_CHECKED_IN") return;
    submitAttendance("check-in");
  };

  const submitCheckOut = () => {
    if (attendanceStatus !== "CHECKED_IN") return;
    submitAttendance("check-out");
  };

  const submitAttendance = (type) => {
    if (!imageBlob) {
      dispatch(
        setPopup({ type: "error", message: "Please capture a photo first" })
      );
      return;
    }
    if (!accountId) {
      dispatch(setPopup({ type: "error", message: "User not logged in" }));
      return;
    }

    setLoading(true);

    if (!navigator.geolocation) {
      dispatch(
        setPopup({ type: "error", message: "Geolocation not supported" })
      );
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        try {
          let data;
          if (type === "check-in") {
            data = await checkInFaceApi({
              accountId,
              imageBlob,
              latitude,
              longitude,
            });
          } else {
            data = await checkOutFaceApi({ accountId, imageBlob });
          }

          if (data.error) {
            dispatch(setPopup({ type: "error", message: data.error }));
          } else {
            dispatch(
              setPopup({
                type: "success",
                message:
                  type === "check-in"
                    ? "Face check-in successful"
                    : "Check-out successful",
              })
            );
            setAttendanceStatus(
              type === "check-in" ? "CHECKED_IN" : "CHECKED_OUT"
            );
            setImageBlob(null);
          }
        } catch (err) {
          const message = err.error || err.message || "Failed to verify face";
          dispatch(setPopup({ type: "error", message }));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        dispatch(
          setPopup({
            type: "error",
            message: "Cannot get location, using default company location",
          })
        );

        const latitude = 10.850697;
        const longitude = 106.7224353;

        (async () => {
          try {
            let data;
            if (type === "check-in") {
              data = await checkInFaceApi({
                accountId,
                imageBlob,
                latitude,
                longitude,
              });
            } else {
              data = await checkOutFaceApi({ accountId, imageBlob });
            }

            if (data.error) {
              dispatch(setPopup({ type: "error", message: data.error }));
            } else {
              dispatch(
                setPopup({
                  type: "success",
                  message:
                    type === "check-in"
                      ? "Face check-in successful"
                      : "Check-out successful",
                })
              );
              setAttendanceStatus(
                type === "check-in" ? "CHECKED_IN" : "CHECKED_OUT"
              );
              setImageBlob(null);
            }
          } catch {
            dispatch(
              setPopup({ type: "error", message: "Failed to verify face" })
            );
          } finally {
            setLoading(false);
          }
        })();
      }
    );
  };

  return (
    <Box
      sx={{
        maxWidth: 600,
        mx: "auto",
        p: 5,
        border: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
        borderRadius: 4,
        textAlign: "center",
        mt: 6,
        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
      }}
    >
      <Typography
        variant="h4"
        mb={4}
        color={theme.palette.primary.main}
        fontWeight={800}
      >
        Face Verify via Camera
      </Typography>

      {attendanceStatus === "CHECKED_OUT" ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            mt: 6,
          }}
        >
          <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
          <Typography variant="h4" color="success.main" fontWeight={700}>
            Bạn đã hoàn thành chấm công hôm nay.
          </Typography>
        </Box>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              maxHeight: 400,
              borderRadius: 12,
              border: `3px solid ${alpha(theme.palette.primary.main, 0.8)}`,
              marginBottom: 20,
              objectFit: "cover",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <Stack direction="row" spacing={3} mb={3} justifyContent="center">
            <Button
              variant="outlined"
              onClick={capturePhoto}
              disabled={loading}
              sx={{ flex: 1, fontSize: "1.2rem", py: 1.5 }}
            >
              Capture
            </Button>

            {attendanceStatus === "NOT_CHECKED_IN" && (
              <Button
                variant="contained"
                onClick={submitCheckIn}
                disabled={!imageBlob || loading}
                sx={{ flex: 1, fontSize: "1.2rem", py: 1.5 }}
              >
                {loading ? <CircularProgress size={28} /> : "Check In"}
              </Button>
            )}

            {attendanceStatus === "CHECKED_IN" && (
              <Button
                variant="contained"
                onClick={submitCheckOut}
                disabled={!imageBlob || loading}
                sx={{ flex: 1, fontSize: "1.2rem", py: 1.5 }}
              >
                {loading ? <CircularProgress size={28} /> : "Check Out"}
              </Button>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}
