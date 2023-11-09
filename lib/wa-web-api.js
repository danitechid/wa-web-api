/*
 * Information
 * Creator / Developer: Dani Ramdani (Dani Techno.) - FullStack Engineer
 * Contact creator / Developer: 0895 1254 5999 (WhatsApp), contact@danitechno.com (Email)
*/

/* Thanks to
 * Dani Techno. - FullStack Engineer (Creator / Developer)
 * @whiskeysockets/baileys (Library "Baileys" provider)
*/

const {
  makeWASocket,
  useMultiFileAuthState,
  makeInMemoryStore,
  PHONENUMBER_MCC,
  makeCacheableSignalKeyStore,
  jidDecode,
  downloadContentFromMessage,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const {
  Boom
} = require('@hapi/boom');
const pino = require('pino');
const readLine = require('readline');
const qrCodeTerminal = require('qrcode-terminal');
const chalk = require('chalk');
const fs = require('fs');
const FileType = require('file-type');

const {
  smsg,
  fetchJson,
  fetchBuffer,
  writeExifImage,
  writeExifVideo,
  imageToWebp,
  videoToWebp
} = require('./utils.js');

const store = makeInMemoryStore({
  logger: pino().child({
    level: 'silent',
    stream: 'store'
  })
});

async function startServer(config, client) {
  try {
    const rl = readLine.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (text) => new Promise((resolve) => rl.question(text, resolve));
    
    const pairingCode = config.pairing_mode || process.argv.includes('--pairing-code');
    const useMobile = process.argv.includes('--mobile');

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(`./${config.session_folder_name}`);
    const sock = makeWASocket({
      logger: pino({
        level: 'silent'
      }),
      printQRInTerminal: !pairingCode,
      mobile: useMobile,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({
          level: 'silent'
        }).child({
          level: 'silent'
        })),
      },
      browser: config.browser
    });

    store.bind(sock.ev);
    
    if (pairingCode && !sock.authState.creds.registered) {
      if (useMobile) throw new Error('Cannot use pairing code with mobile API');

      let phoneNumber;
      if (!!phoneNumber) {
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
          console.log(chalk.bgBlack(chalk.redBright('Start with country code of your WhatsApp Number, Example : 628xxxx'), '\n> '));
          process.exit(0);
        }
        rl.close();
      } else {
        phoneNumber = await question(chalk.bgBlack(chalk.greenBright('Silahkan masukan nomor WhatsApp anda contoh: 628xxx'), '\n> '));
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
          console.log(chalk.bgBlack(chalk.redBright('Start with country code of your WhatsApp Number, Example : 628xxxx'), '\n> '));

          phoneNumber = await question(chalk.bgBlack(chalk.greenBright('Silahkan masukan nomor WhatsApp anda contoh: 628xxx'), '\n> '));
          phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
          rl.close();
        }
      }

      setTimeout(async () => {
        let code = await sock.requestPairingCode(phoneNumber);
        code = code.match(/.{1,4}/g).join('-') || code;
        console.log(chalk.black(chalk.greenBright('Pairing kode anda:')), chalk.black(chalk.white(code)));
      }, 0);
    }

    sock.ev.on('creds.update', await saveCreds);

    sock.ev.on('connection.update', async (update) => {
      rl.close();
      const {
        connection,
        lastDisconnect
      } = update;
      if (connection === 'close') {
        let reason = new Boom(lastDisconnect.error).output.statusCode;
        if (reason === DisconnectReason.badSession) {
          //console.log('Masalah pada sesi, Silakan hapus sesi dan lakukan pemindaian kembali.');
          console.log('Issue with the session, please delete the session and rescan.');
          sock.logout();
        } else if (reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost) {
          //console.log('Koneksi ditutup atau terputus, melakukan koneksi ulang...');
          console.log('Connection closed or lost, reconnecting...');
          startServer(config, client);
        } else if (reason === DisconnectReason.connectionReplaced) {
          //console.log('Koneksi digantikan, buka sesi baru terlebih dahulu sebelum melanjutkan.');
          console.log('Connection replaced, open a new session before continuing.');
          sock.logout();
        } else if (reason === DisconnectReason.loggedOut) {
          //console.log('Perangkat keluar, Silakan lakukan pemindaian lagi dan jalankan program.');
          console.log('Device logged out, please rescan and run the program again.');
          sock.logout();
        } else if (reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut) {
          //console.log('Perlu me-restart, Merestart...');
          console.log('Restart required, restarting...');
          startServer(config, client);
        } else if (reason === DisconnectReason.Multidevicemismatch) {
          //console.log('Pencocokan perangkat ganda, silakan lakukan pemindaian kembali.');
          console.log('Multiple device mismatch, please rescan.');
          sock.logout();
        } else {
          //sock.end(`Alasan Putus yang Tidak Dikenal: ${reason}|${connection}`);
          sock.end(`Unknown Disconnect Reason: ${reason}|${connection}`);
        }
      } else if (connection === 'open') {
        const userName = sock.user.name ? sock.user.name : config.bot.name;

        console.log(chalk.bold(chalk.cyan.blue('• User Info')));
        console.log(chalk.cyan(`- Name     : ${userName}`));
        console.log(chalk.cyan(`- Number   : ${sock.user.id.split(':')[0]}`));
        console.log(chalk.cyan(`- Status   : Connected`));
      }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
      try {
        const mek = chatUpdate.messages[0];
        if (!mek.message) return;
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
        if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
        if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
        const messages = smsg(sock, mek, store);
        client({
          client: sock,
          messages
        });
      } catch (error) {
        console.error(error.message);
      }
    });

    sock.ev.on('contacts.update', (update) => {
      for (let contact of update) {
        let id = sock.decodeJid(contact.id);
        
        if (store && store.contacts) store.contacts[id] = {
          id,
          name: contact.notify
        }
      }
    });

    sock.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
      } else return jid;
    };

    sock.public = config.public_mode;
    
    sock.serializeM = (m) => smsg(sock, m, store);

    sock.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
      let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetchBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      let buffer;
      
      if (options && (options.packname || options.author)) {
        buffer = await writeExifImage(buff, options);
      } else {
        buffer = await imageToWebp(buff);
      };

      await sock.sendMessage(jid, {
        sticker: {
          url: buffer
        },
        ...options
      }, {
        quoted
      });
      return buffer;
    };
    
    sock.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
      let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetchBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
      let buffer;
      
      if (options && (options.packname || options.author)) {
        buffer = await writeExifVideo(buff, options);
      } else {
        buffer = await videoToWebp(buff);
      };

      await sock.sendMessage(jid, {
        sticker: {
          url: buffer
        },
        ...options
      }, {
        quoted
      });

      return buffer;
    };

    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
      let quoted = message.msg ? message.msg : message;
      let mime = (message.msg || message).mimetype || '';
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
      const stream = await downloadContentFromMessage(quoted, messageType);
      let buffer = Buffer.from([]);
      
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      };
      
      let type = await FileType.fromBuffer(buffer);
      trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;

      await fs.writeFileSync(trueFileName, buffer);
      return trueFileName;
    };

    sock.downloadMediaMessage = async (message) => {
      let mime = (message.msg || message).mimetype || '';
      let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
      const stream = await downloadContentFromMessage(message, messageType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      };

      return buffer;
    };
    
    sock.sendTextMessage = (jid, text, quoted) => {
      return sock.sendMessage(jid, {
        text: text,
      }, {
        quoted: quoted
      })
    };

    sock.sendImageMessage = (jid, title, description, sourceUrl, thumbnailUrl, caption, renderLargerThumbnail, showAdAttribution, quoted) => {
      return sock.sendMessage(jid, {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: title,
            body: description,
            sourceUrl: sourceUrl,
            thumbnailUrl: thumbnailUrl,
            mediaType: 1,
            renderLargerThumbnail: renderLargerThumbnail,
            showAdAttribution: showAdAttribution
          }
        }
      }, {
        quoted: quoted
      })
    };
    
    return sock;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  startServer: startServer
};