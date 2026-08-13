/// Política de Privacidad HERMES UTEQ — texto canónico (móvil).
/// Mantener alineado con apps/web/src/lib/legal/privacy-policy.ts

class PrivacySection {
  const PrivacySection({
    required this.title,
    required this.paragraphs,
    this.bullets = const [],
  });

  final String title;
  final List<String> paragraphs;
  final List<String> bullets;
}

class PrivacyPolicy {
  static const title = 'Política de Privacidad y Manejo de Datos';
  static const subtitle = 'Ecosistema de Seguridad HERMES (Web, App Móvil e IoT)';
  static const version = '2.1';
  static const updatedAt = '12 de agosto de 2026';
  static const contactEmail = 'hermes@uteq.edu.mx';

  static const intro = <String>[
    'El presente documento describe cómo el ecosistema HERMES recopila, usa, almacena, comparte y protege datos personales de la comunidad UTEQ.',
    'Aplica a la plataforma web, la aplicación móvil Android y los dispositivos IoT vinculados (pulsera SOS / ESP32), operados para fines de seguridad universitaria.',
    'El uso de HERMES implica que usted conoce y acepta esta política. Si no está de acuerdo, no debe utilizar el servicio.',
  ];

  static const sections = <PrivacySection>[
    PrivacySection(
      title: '1. Responsable del tratamiento',
      paragraphs: [
        'HERMES es un sistema de alertas e incidentes universitarios desarrollado para la UTEQ. El tratamiento de datos se realiza con finalidad institucional de seguridad y atención de emergencias en el campus.',
        'Para ejercer derechos ARCO (acceso, rectificación, cancelación u oposición) o consultas sobre privacidad, puede escribir a hermes@uteq.edu.mx o acudir a las áreas competentes de la institución.',
      ],
    ),
    PrivacySection(
      title: '2. Información que recopilamos',
      paragraphs: [
        'Según el uso que haga de la plataforma, podemos tratar las siguientes categorías de datos:',
      ],
      bullets: [
        'Identificación y cuenta: nombre, apellidos, matrícula, correo institucional (@uteq.edu.mx), teléfono, rol y estado de la cuenta.',
        'Autenticación: credenciales gestionadas mediante proveedor de identidad seguro (sesión / tokens).',
        'Geolocalización: coordenadas GPS o estimadas (incluido dispositivo IoT / Wi‑Fi) al crear reportes, activar SOS, ordenar alertas cercanas o registrar el dispositivo para notificaciones push.',
        'Incidentes y validaciones: tipo de reporte, descripción, ubicación, estado y confirmaciones de otros usuarios.',
        'Dispositivos: tokens de notificaciones push (FCM), plataforma del teléfono y, si lo vincula, código de pulsera SOS.',
        'Eventos de campus: datos de eventos y solicitudes para participar como puesto.',
        'Comunicaciones: push, correo institucional y, en alertas SOS, WhatsApp a números registrados según configuración.',
        'Asistente de reportes: el texto de sus preguntas se procesa con un resumen de incidentes recientes para generar respuestas.',
      ],
    ),
    PrivacySection(
      title: '3. Finalidades del tratamiento',
      paragraphs: ['Utilizamos los datos exclusivamente para:'],
      bullets: [
        'Operar el sistema de alertas e incidentes y facilitar la respuesta ante emergencias (incluido SOS de app o pulsera).',
        'Mostrar mapas e información de reportes activos a la comunidad autorizada.',
        'Enviar notificaciones push, correos y, cuando aplique, WhatsApp sobre incidentes, validaciones y eventos.',
        'Permitir la vinculación y operación de dispositivos wearables de emergencia.',
        'Administrar eventos de campus y solicitudes de participación.',
        'Mejorar la seguridad del servicio (prevención de abuso, control de roles y auditoría técnica).',
      ],
    ),
    PrivacySection(
      title: '4. Base y naturaleza del tratamiento',
      paragraphs: [
        'El tratamiento se realiza en el marco del servicio institucional de seguridad universitaria y del consentimiento al registrarse y al habilitar permisos del dispositivo (ubicación, notificaciones).',
        'Algunas funciones requieren permisos del sistema operativo; puede denegarlos, pero ello limitará esas funciones.',
      ],
    ),
    PrivacySection(
      title: '5. Conservación de los datos',
      paragraphs: [
        'Los datos de cuenta se conservan mientras su perfil permanezca activo en HERMES.',
        'Los reportes se conservan el tiempo necesario para atención y seguimiento institucional, conforme a políticas de la UTEQ.',
        'Los tokens de notificación y la ubicación asociada se actualizan con el uso y pueden invalidarse al cerrar sesión o desinstalar la app.',
        'Puede solicitar revisión o eliminación de su cuenta al contacto de privacidad, sujeto a obligaciones legales o de seguridad.',
      ],
    ),
    PrivacySection(
      title: '6. Con quién se comparte la información',
      paragraphs: [
        'HERMES no vende ni alquila datos personales. La información se comparte solo en estos supuestos:',
      ],
      bullets: [
        'Personal autorizado de UTEQ (administradores y responsables) para atender incidentes.',
        'Proveedores tecnológicos necesarios (nube, autenticación, Firebase/FCM, correo, WhatsApp Business API, geolocalización o asistencia con IA), bajo medidas razonables.',
        'Autoridades competentes cuando exista obligación legal o requerimiento válido.',
      ],
    ),
    PrivacySection(
      title: '7. Medidas de seguridad',
      paragraphs: ['Implementamos controles razonables, entre ellos:'],
      bullets: [
        'Autenticación con cuenta institucional y control de acceso por roles.',
        'Comunicaciones cifradas (HTTPS) hacia los servicios en producción.',
        'Claves de dispositivo para endpoints de pulsera SOS.',
        'Restricción del panel de gestión a perfiles no estudiantes.',
      ],
    ),
    PrivacySection(
      title: '8. Derechos de las personas usuarias',
      paragraphs: ['Usted puede:'],
      bullets: [
        'Conocer qué datos personales tratamos y para qué fines.',
        'Solicitar la corrección de datos de perfil inexactos.',
        'Solicitar la baja o limitación de su cuenta, cuando proceda.',
        'Revocar permisos de ubicación y notificaciones en su dispositivo.',
        'Desvincular su pulsera SOS desde el perfil.',
        'Presentar consultas al contacto de privacidad.',
      ],
    ),
    PrivacySection(
      title: '9. Menores de edad y comunidad universitaria',
      paragraphs: [
        'HERMES está dirigido a la comunidad UTEQ con cuenta institucional. Quien se registre declara contar con legitimación para usar el servicio conforme a las normas de la universidad.',
      ],
    ),
    PrivacySection(
      title: '10. Cambios a esta política',
      paragraphs: [
        'Podemos actualizar este documento para reflejar cambios del sistema. La versión vigente se publica en la web y en la app. El uso continuado implica conocimiento de la versión actualizada.',
      ],
    ),
  ];

  static const footer = <String>[
    'Desarrollado por Qnet Technology (Equipo HERMES).',
    'Integrantes: Edgar Alexander Cuervo Fajardo, Miguel Ángel Cruz May, Fernando Gonzales Cristino, Ximena Lizet Rico Guerrero.',
    'Versión $version · Actualizada el $updatedAt.',
  ];
}
