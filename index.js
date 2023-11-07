/*
 * Information
 * Creator / Developer: Dani Ramdani (Dani Techno.) - FullStack Engineer
 * Contact creator / Developer: 0895 1254 5999 (WhatsApp), contact@danitechno.com (Email)
*/

/* Thanks to
 * Dani Techno. - FullStack Engineer (Creator / Developer)
 * @whiskeysockets/baileys (Library "Baileys" provider)
*/

const wwa = require('./lib/wa-web-api.js');

const {
  startServer
} = wwa;

module.exports = {
  default: startServer,
  start: startServer,
  startServer: startServer,
  makeWASocket: startServer,
  connectToWhatsApp: startServer
};