# WhatsApp Web API - TypeScript/JavaScript
WhatsApp Web API ini ditenagai oleh library: Baileys

## Instalasi
### Menggunakan Npm
```bash
npm i @danitech/wa-web-api
```

### Atau Menggunakan Yarn
```bash
yarn add @danitech/wa-web-api
```

## Contoh Kode
### ./package.json
```json
{
  "name": "whatsapp-bot",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "@danitech/wa-web-api": "latest",
    "fs": "latest",
    "chalk": "^4.1.2"
  },
  "devDependencies": {
    "nodemon": "~3.0.1"
  }
}
```

### ./nodemon.json
```json
{
  "watch": ["config/settings.js", "includes/client.js"],
  "ext": "js"
}
```

### ./index.js
```javascript
const server = require('@danitech/wa-web-api');
const fs = require('fs');
const chalk = require('chalk');
const config = require('./config/settings.js');
const client = require('./includes/client.js');

const startServer = (config, client) => {
  return server.start(config, client);
};

startServer(config, client);
```

### ./config/settings.js
```javascript
module.exports = {
  pairing_mode: true,
  session_folder_name: 'session',
  browser: ["Chrome (Windows)", "latest"],
  public_mode: true,
  prefix: '.',
  bot: {
    name: 'Bot Name'
  },
  owner: {
    name: 'Owner Name',
    number: '628xxx'
  }
};
```

### ./includes/client.js
```javascript
const chalk = require('chalk');
const config = require('../config/settings.js');

module.exports = async ({
  client,
  messages
}) => {
  try {
    const body = messages.mtype === 'conversation' ? messages.message.conversation : messages.mtype === 'extendedTextMessage' ? messages.message.extendedTextMessage.text : '';
    const budy = typeof messages.text === 'string' ? messages.text : '';
    const command = body.startsWith(config.prefix) ? body.replace(config.prefix, '').trim().split(/ +/).shift().toLowerCase() : '';
    const cleanCommand = command.replace(config.prefix, '');
    const args = body.trim().split(/ +/).slice(1);
    const query = q = args.join(' ');
    const query1 = q1 = query.split('|')[0]
    const query2 = q2 = query.split('|')[1]

    const ownerNumbers = config.owner.number;
    const senderNumber = messages.sender.replace(/\D/g, '');
    const senderName = messages.pushName || 'Undefined';
    const isOwner = ownerNumbers.includes(messages.sender);

    if (!config.public_mode) {
      if (!messages.key.fromMe) {
        return;
      };
    };

    if (messages.message) {
      client.readMessages([messages.key]);

      console.log(
        chalk.bgMagenta(' [New Message] '),
        chalk.cyanBright('Time: ') + chalk.greenBright(new Date()) + '\n',
        chalk.cyanBright('Message: ') + chalk.greenBright(budy || messages.mtype) + '\n' +
        chalk.cyanBright('From:'), chalk.greenBright(senderName), chalk.yellow('- ' + senderNumber) + '\n' +
        chalk.cyanBright('Chat Type:'), chalk.greenBright(!messages.isGroup ? 'Private Chat' : 'Group Chat - ' + chalk.yellow(messages.chat))
      );
    };

    if (!body.startsWith(config.prefix) || body === config.prefix) {
      return;
    };

    switch (cleanCommand) {
      case 'test': {
        messages.reply('Ok, Success!');
        break;
      };
      
      default: {
        messages.reply(`Command: ${config.prefix}${cleanCommand}, tidak tersedia!`);
      };
    };
  } catch (error) {
    messages.reply('Terjadi kesalahan pada server.');
    console.error(error);
  };
};
```

### Contoh kode/skrip bot WhatsApp lengkap
<a href="https://github.com/danitechid/example-wa-bot-script">Klik disini</a> untuk mengunduh proyek.

## Informasi
* Pembuat / Pengembang: Dani Ramdani (Dani Techno.) - FullStack Engineer
* Kontak Pembuat / Pengembang: 0895 1254 5999 (WhatsApp), contact@danitechno.com (Email)

## Terimakasih Kepada
* Dani Techno. - FullStack Engineer (Pembuat / Pengembang)
* @whiskeysockets/baileys (Penyedia Library "Baileys")