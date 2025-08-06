// lib/realtime/notification_socket.dart
import 'dart:convert';
import 'package:mobile/models/notification.dart';
import 'package:mobile/providers/notification_provider.dart';
import 'package:stomp_dart_client/stomp.dart';
import 'package:stomp_dart_client/stomp_config.dart';
import 'package:stomp_dart_client/stomp_frame.dart';

class NotificationSocket {
  static StompClient? _client;

  static void connect(String username, NotificationProvider provider) {
    if (_client != null && _client!.connected) return;

    _client = StompClient(
      config: StompConfig(
        url: 'ws://10.0.2.2:4040/api/ws/websocket',
        onConnect: (StompFrame frame) {
          _client!.subscribe(
            destination: '/topic/notifications/$username',
            callback: (StompFrame frame) {
              if (frame.body != null) {
                final data = json.decode(frame.body!);
                final noti = NotificationModel.fromJson(data);
                provider.addNotification(noti);
              }
            },
          );
        },
        onWebSocketError: (error) => print("WebSocket error: $error"),
        onDisconnect: (_) => print("WebSocket disconnected"),
        onStompError: (frame) => print("STOMP error: ${frame.body}"),
        heartbeatOutgoing: const Duration(seconds: 10),
        heartbeatIncoming: const Duration(seconds: 10),
      ),
    );

    _client!.activate();
  }

  static void disconnect() {
    _client?.deactivate();
    _client = null;
  }
}
