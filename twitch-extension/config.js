/* Riftbound Card Lens — broadcaster config page (stub).
 * No configuration is required yet; this page exists because Twitch
 * requires a config path for extensions. Future settings (e.g. image
 * host, hotspot opacity defaults) would live here via
 * Twitch.ext.configuration.set(...).
 */

'use strict';

if (window.Twitch && window.Twitch.ext) {
  window.Twitch.ext.onAuthorized(function () {
    // Nothing to configure yet.
  });
}
