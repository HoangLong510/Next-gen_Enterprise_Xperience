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
  checkInStatusApi,
} from "~/services/attendance.service";
import { setPopup } from "~/libs/features/popup/popupSlice";

export default function FaceCameraVerify() {
  const theme = useTheme();
  const dispatch = useDispatch();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [imageBlob, setImageBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const account = useSelector((state) => state.account.value);
  const accountId = account?.id;

  useEffect(() => {
    if (!accountId) return;

    async function fetchCheckInStatus() {
      try {
        const hasCheckedIn = await checkInStatusApi(accountId);
        setCheckedInToday(hasCheckedIn);
        if (hasCheckedIn) {
          stopCamera();
        } else {
          startCamera();
        }
      } catch (error) {
        dispatch(
          setPopup({
            type: "error",
            message: "Failed to fetch check-in status",
          })
        );
      }
    }

    fetchCheckInStatus();

    return () => stopCamera();
  }, [accountId, dispatch]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      dispatch(setPopup({ type: "error", message: "Cannot access camera" }));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (checkedInToday) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      setImageBlob(blob);
      setResult(null);
    }, "image/jpeg");
  };

  const submitPhoto = () => {
    if (checkedInToday) return;

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
          const data = await checkInFaceApi({
            accountId,
            imageBlob,
            latitude,
            longitude,
          });
          setResult(data);

          if (data.error) {
            dispatch(setPopup({ type: "error", message: data.error }));
          } else if (data === "User already checked in today") {
            dispatch(
              setPopup({
                type: "error",
                message: "Bạn đã chấm công hôm nay rồi.",
              })
            );
            setCheckedInToday(true);
          } else {
            dispatch(
              setPopup({ type: "success", message: "Face check-in successful" })
            );
            setCheckedInToday(true);
          }
        } catch (err) {
          const message = err.error || err.message || "Failed to verify face";
          dispatch(setPopup({ type: "error", message }));
          setResult({ error: message });
        } finally {
          setLoading(false);
        }
      },
      async (err) => {
        dispatch(
          setPopup({
            type: "error",
            message: "Cannot get location, using default company location",
          })
        );

        const latitude = 10.850697;
        const longitude = 106.7224353;

        try {
          const data = await checkInFaceApi({
            accountId,
            imageBlob,
            latitude,
            longitude,
          });
          setResult(data);

          if (data.error) {
            dispatch(setPopup({ type: "error", message: data.error }));
          } else if (data === "User already checked in today") {
            dispatch(
              setPopup({
                type: "error",
                message: "Bạn đã chấm công hôm nay rồi.",
              })
            );
            setCheckedInToday(true);
          } else {
            dispatch(
              setPopup({ type: "success", message: "Face check-in successful" })
            );
            setCheckedInToday(true);
          }
        } catch {
          dispatch(
            setPopup({ type: "error", message: "Failed to verify face" })
          );
          setResult({ error: "Failed to verify face" });
        } finally {
          setLoading(false);
        }
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

      {!checkedInToday ? (
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
            <Button
              variant="contained"
              onClick={submitPhoto}
              disabled={!imageBlob || loading}
              sx={{ flex: 1, fontSize: "1.2rem", py: 1.5 }}
            >
              {loading ? <CircularProgress size={28} /> : "Verify Face"}
            </Button>
          </Stack>
        </>
      ) : (
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
            Bạn đã chấm công hôm nay rồi
          </Typography>
        </Box>
      )}
    </Box>
  );
}
