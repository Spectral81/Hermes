import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../domain/privacy_policy.dart';

class PrivacyPolicyPage extends StatelessWidget {
  const PrivacyPolicyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Privacidad'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0.5,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
        children: [
          const Text(
            'HERMES · UTEQ',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: Color(0xFF2563EB),
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            PrivacyPolicy.title,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            PrivacyPolicy.subtitle,
            style: TextStyle(fontSize: 14, color: Color(0xFF64748B), height: 1.35),
          ),
          const SizedBox(height: 8),
          Text(
            'Versión ${PrivacyPolicy.version} · Actualizada el ${PrivacyPolicy.updatedAt}',
            style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 18),
          for (final p in PrivacyPolicy.intro) ...[
            Text(
              p,
              style: const TextStyle(fontSize: 14, height: 1.45, color: Color(0xFF334155)),
            ),
            const SizedBox(height: 10),
          ],
          for (final section in PrivacyPolicy.sections) ...[
            const SizedBox(height: 10),
            Text(
              section.title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            for (final p in section.paragraphs) ...[
              Text(
                p,
                style: const TextStyle(fontSize: 14, height: 1.45, color: Color(0xFF334155)),
              ),
              const SizedBox(height: 8),
            ],
            for (final b in section.bullets) ...[
              Padding(
                padding: const EdgeInsets.only(left: 2, bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '•  ',
                      style: TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w800),
                    ),
                    Expanded(
                      child: Text(
                        b,
                        style: const TextStyle(fontSize: 14, height: 1.4, color: Color(0xFF334155)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
          const SizedBox(height: 16),
          for (final line in PrivacyPolicy.footer) ...[
            Text(
              line,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 4),
          ],
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.mail_outline, color: Color(0xFF2563EB)),
            title: const Text('Contacto privacidad'),
            subtitle: const Text(PrivacyPolicy.contactEmail),
            onTap: () async {
              await Clipboard.setData(
                const ClipboardData(text: PrivacyPolicy.contactEmail),
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Correo copiado')),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}
