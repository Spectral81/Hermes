/**
 * Política de Privacidad HERMES UTEQ — texto canónico (web).
 * Mantener alineado con apps/mobile_flutter/lib/domain/privacy_policy.dart
 */

export interface PrivacySection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const PRIVACY_POLICY_META = {
  title: 'Política de Privacidad y Manejo de Datos',
  subtitle: 'Ecosistema de Seguridad HERMES (Web, App Móvil e IoT)',
  version: '2.1',
  updatedAt: '12 de agosto de 2026',
  institution: 'Universidad Tecnológica de Querétaro (UTEQ)',
  contactEmail: 'hermes@uteq.edu.mx',
  developers: 'Qnet Technology — Edgar Alexander Cuervo Fajardo, Miguel Ángel Cruz May, Fernando Gonzales Cristino, Ximena Lizet Rico Guerrero',
} as const;

export const PRIVACY_POLICY_INTRO = [
  'El presente documento describe cómo el ecosistema HERMES recopila, usa, almacena, comparte y protege datos personales de la comunidad UTEQ.',
  'Aplica a la plataforma web, la aplicación móvil Android y los dispositivos IoT vinculados (pulsera SOS / ESP32), operados para fines de seguridad universitaria.',
  'El uso de HERMES implica que usted conoce y acepta esta política. Si no está de acuerdo, no debe utilizar el servicio.',
] as const;

export const PRIVACY_POLICY_SECTIONS: PrivacySection[] = [
  {
    title: '1. Responsable del tratamiento',
    paragraphs: [
      'HERMES es un sistema de alertas e incidentes universitarios desarrollado para la UTEQ. El tratamiento de datos se realiza con finalidad institucional de seguridad y atención de emergencias en el campus.',
      'Para ejercer derechos ARCO (acceso, rectificación, cancelación u oposición) o consultas sobre privacidad, puede escribir a hermes@uteq.edu.mx o acudir a las áreas competentes de la institución.',
    ],
  },
  {
    title: '2. Información que recopilamos',
    paragraphs: [
      'Según el uso que haga de la plataforma, podemos tratar las siguientes categorías de datos:',
    ],
    bullets: [
      'Identificación y cuenta: nombre, apellidos, matrícula, correo institucional (@uteq.edu.mx), teléfono, rol (estudiante, administradores o responsables) y estado de la cuenta.',
      'Autenticación: credenciales gestionadas mediante proveedor de identidad seguro (sesión / tokens); HERMES no vende contraseñas a terceros.',
      'Geolocalización: coordenadas GPS o estimadas (incluido dispositivo IoT / Wi‑Fi) al crear reportes, activar SOS, ordenar alertas cercanas o registrar el dispositivo para notificaciones push.',
      'Incidentes y validaciones: tipo de reporte (robo, accidente, infraestructura, pánico), descripción, ubicación, estado del reporte y confirmaciones de otros usuarios.',
      'Dispositivos: tokens de notificaciones push (FCM), plataforma del teléfono y, si lo vincula, código de pulsera SOS.',
      'Eventos de campus: datos de eventos y, si aplica, solicitudes para participar como puesto (nombre del negocio, qué vende, categoría, etc.).',
      'Comunicaciones: mensajes enviados por push, correo institucional y, en alertas SOS, WhatsApp a números registrados para personal autorizado, según configuración del sistema.',
      'Asistente de reportes: el texto de sus preguntas al chatbot se procesa junto con un resumen de incidentes recientes para generar respuestas; no debe usarse para datos ajenos a seguridad del campus.',
    ],
  },
  {
    title: '3. Finalidades del tratamiento',
    paragraphs: ['Utilizamos los datos exclusivamente para:'],
    bullets: [
      'Operar el sistema de alertas e incidentes y facilitar la respuesta institucional ante emergencias (incluido SOS de app o pulsera).',
      'Mostrar mapas e información de reportes activos a la comunidad autorizada.',
      'Enviar notificaciones push, correos y, cuando aplique, mensajes WhatsApp relacionados con incidentes, validaciones y eventos.',
      'Permitir la vinculación y operación de dispositivos wearables de emergencia.',
      'Administrar eventos de campus y solicitudes de participación.',
      'Mejorar la seguridad del servicio (prevención de abuso, control de roles y auditoría técnica).',
    ],
  },
  {
    title: '4. Base y naturaleza del tratamiento',
    paragraphs: [
      'El tratamiento se realiza en el marco del servicio institucional de seguridad universitaria y del consentimiento que usted otorga al registrarse y al habilitar permisos del dispositivo (ubicación, notificaciones).',
      'Algunas funciones (validación cercana, push, SOS con ubicación) requieren permisos del sistema operativo; puede denegarlos, pero ello limitará o deshabilitará esas funciones.',
    ],
  },
  {
    title: '5. Conservación de los datos',
    paragraphs: [
      'Los datos de cuenta se conservan mientras su perfil permanezca activo en HERMES.',
      'Los reportes e historial de incidentes se conservan el tiempo necesario para atención, seguimiento institucional y mejora de la seguridad del campus, y pueden archivarse o eliminarse conforme a políticas internas de la UTEQ.',
      'Los tokens de notificación y la ubicación asociada al dispositivo se actualizan con el uso de la app y pueden invalidarse al cerrar sesión o desinstalar la aplicación.',
      'Puede solicitar la revisión o eliminación de su cuenta escribiendo al contacto de privacidad, sujeto a obligaciones legales o de seguridad que impidan el borrado inmediato.',
    ],
  },
  {
    title: '6. Con quién se comparte la información',
    paragraphs: [
      'HERMES no vende ni alquila datos personales.',
      'La información se comparte solo en estos supuestos:',
    ],
    bullets: [
      'Personal autorizado de UTEQ (administradores y responsables) para atender incidentes y operar el panel.',
      'Proveedores tecnológicos necesarios para el servicio (por ejemplo: infraestructura en la nube, base de datos/autenticación, Firebase Cloud Messaging, servicios de correo, WhatsApp Business API de Meta y APIs de geolocalización o asistencia con IA), bajo medidas de seguridad razonables.',
      'Autoridades competentes cuando exista obligación legal o requerimiento válido.',
    ],
  },
  {
    title: '7. Medidas de seguridad',
    paragraphs: [
      'Implementamos controles técnicos y organizativos razonables, entre ellos:',
    ],
    bullets: [
      'Autenticación con cuenta institucional y control de acceso por roles.',
      'Comunicaciones cifradas (HTTPS) hacia los servicios en producción.',
      'Claves de dispositivo para endpoints de pulsera SOS.',
      'Restricción del panel de gestión a perfiles no estudiantes.',
    ],
  },
  {
    title: '8. Derechos de las personas usuarias',
    paragraphs: ['Usted puede:'],
    bullets: [
      'Conocer qué datos personales tratamos y para qué fines.',
      'Solicitar la corrección de datos de perfil inexactos o desactualizados.',
      'Solicitar la baja o limitación de su cuenta, cuando proceda.',
      'Revocar permisos de ubicación y notificaciones en su dispositivo.',
      'Desvincular su pulsera SOS desde el perfil.',
      'Presentar consultas o quejas al contacto de privacidad indicado.',
    ],
  },
  {
    title: '9. Menores de edad y comunidad universitaria',
    paragraphs: [
      'HERMES está dirigido a la comunidad UTEQ con cuenta institucional. Quien se registre declara contar con legitimación para usar el servicio conforme a las normas de la universidad.',
    ],
  },
  {
    title: '10. Cambios a esta política',
    paragraphs: [
      'Podemos actualizar este documento para reflejar cambios del sistema o requerimientos institucionales. La versión vigente se publica en la web y en la app. El uso continuado tras la publicación implica conocimiento de la versión actualizada.',
    ],
  },
];

export const PRIVACY_POLICY_FOOTER = [
  'Desarrollado por Qnet Technology (Equipo HERMES).',
  'Integrantes: Edgar Alexander Cuervo Fajardo, Miguel Ángel Cruz May, Fernando Gonzales Cristino, Ximena Lizet Rico Guerrero.',
  `Versión ${PRIVACY_POLICY_META.version} · Actualizada el ${PRIVACY_POLICY_META.updatedAt}.`,
] as const;
