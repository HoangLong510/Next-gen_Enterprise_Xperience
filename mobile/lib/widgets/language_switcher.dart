import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    final current = context.locale;

    return Material(
      child: IntrinsicWidth(
        child: DropdownButtonFormField<Locale>(
          value: current,
          icon: const Icon(Icons.arrow_drop_down),
          decoration: InputDecoration(
            labelText: 'Language'.tr(),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
          ),
          onChanged: (Locale? locale) {
            if (locale != null) {
              context.setLocale(locale);
            }
          },
          items: const [
            DropdownMenuItem(
              value: Locale('en'),
              child: Row(
                children: [
                  Text('🇺🇸', style: TextStyle(fontSize: 18)),
                  SizedBox(width: 8),
                  Text('English'),
                ],
              ),
            ),
            DropdownMenuItem(
              value: Locale('vi'),
              child: Row(
                children: [
                  Text('🇻🇳', style: TextStyle(fontSize: 18)),
                  SizedBox(width: 8),
                  Text('Tiếng Việt'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
