import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";

export function useNotificationRealtime(username, onNewNotification) {
  const stompClient = useRef(null);

  useEffect(() => {
    if (!username) return;

    stompClient.current = Stomp.over(
      () => new SockJS("http://localhost:4040/api/ws")
    );
    stompClient.current.debug = () => {};

    stompClient.current.connect({}, () => {
      stompClient.current.subscribe(
        `/topic/notifications/${username}`,
        (message) => {
          if (message.body) {
            const noti = JSON.parse(message.body);
            onNewNotification && onNewNotification(noti);
          }
        }
      );
    });

    return () => {
      if (stompClient.current && stompClient.current.connected) {
        stompClient.current.disconnect();
        stompClient.current = null;
        console.log("Disconnected stomp client");
      }
    };
  }, [username, onNewNotification]);
}
