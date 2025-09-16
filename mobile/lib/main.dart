import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile/helpers/theme.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/routes/app_routes.dart';
import 'package:mobile/services/api_service.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:mobile/providers/notification_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  await dotenv.load();

  final authProvider = AuthProvider();
  ApiService.setAuthProvider(authProvider);

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('vi')],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      useOnlyLangCode: true,
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => authProvider),
          ChangeNotifierProvider(
            create: (_) => NotificationProvider(),
          ),
        ],
        child: const MyApp(),
      ),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: dotenv.env["APP_NAME"],
      debugShowCheckedModeBanner: false,
      locale: context.locale,
      supportedLocales: context.supportedLocales,
      localizationsDelegates: context.localizationDelegates,
      theme: rootTheme,
      initialRoute: "/",
      onGenerateRoute: generateRoute,
    );
  }
}
