/**
 * Buddy Telemetry — configuración del módulo.
 */
window.BuddyTelemetryConfig = window.BuddyTelemetryConfig || {};
window.BuddyTelemetryConfig = Object.assign({
  enabled: true,
  apiUrl: 'https://api.statetty.com/api/buddy/telemetry'
}, window.BuddyTelemetryConfig || {});
