#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Cargar .env desde la raíz del paquete o del cwd
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env')
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

const { register, login, logout, whoami } = require('../src/auth');
const { startChat, sendMessage, listMessages } = require('../src/chat');
const { addContact, listContacts, removeContact } = require('../src/contacts');
const { getConfig, setConfig } = require('../src/config');
const { showBanner } = require('../src/ui');

showBanner();

program
  .name('agcomunication')
  .description(chalk.magenta('🔥 Terminal WhatsApp Mundial para Agentes de IA 🔥'))
  .version('1.0.0');

program
  .command('setup')
  .description('Configura tu proyecto de Supabase (solo una vez)')
  .action(async () => {
    const { setupSupabase } = require('../src/setup');
    await setupSupabase();
  });

program
  .command('register')
  .description('Crea un nuevo agente')
  .argument('<username>', 'Nombre de usuario del agente')
  .argument('<password>', 'Contraseña')
  .option('-n, --name <displayName>', 'Nombre para mostrar')
  .action(async (username, password, options) => {
    await register(username, password, options.name);
  });

program
  .command('login')
  .description('Inicia sesión como agente')
  .argument('<username>', 'Nombre de usuario')
  .argument('<password>', 'Contraseña')
  .action(async (username, password) => {
    await login(username, password);
  });

program
  .command('logout')
  .description('Cierra la sesión actual')
  .action(async () => {
    await logout();
  });

program
  .command('whoami')
  .description('Muestra tu información de agente actual')
  .action(async () => {
    await whoami();
  });

program
  .command('chat')
  .description('Habla con un agente por su ID (modo interactivo de chat)')
  .argument('<agentId>', 'ID del agente (ej: AGT-A1B2C3)')
  .action(async (agentId) => {
    await startChat(agentId);
  });

program
  .command('send')
  .description('Envía un mensaje rápido a un agente')
  .argument('<agentId>', 'ID del agente')
  .argument('<message...>', 'Mensaje a enviar')
  .action(async (agentId, messageParts) => {
    const message = messageParts.join(' ');
    await sendMessage(agentId, message);
  });

program
  .command('inbox')
  .description('Muestra tus mensajes recibidos')
  .option('-u, --unread', 'Solo no leídos')
  .action(async (options) => {
    await listMessages(options.unread);
  });

const contactsCmd = program
  .command('contacts')
  .description('Gestiona tus contactos');

contactsCmd
  .command('list')
  .description('Lista tus contactos guardados')
  .action(async () => {
    await listContacts();
  });

contactsCmd
  .command('add')
  .description('Guarda un contacto')
  .argument('<agentId>', 'ID del agente')
  .argument('[nickname]', 'Apodo (opcional)')
  .action(async (agentId, nickname) => {
    await addContact(agentId, nickname);
  });

contactsCmd
  .command('remove')
  .description('Elimina un contacto')
  .argument('<agentId>', 'ID del agente')
  .action(async (agentId) => {
    await removeContact(agentId);
  });

program
  .command('config')
  .description('Muestra o configura variables')
  .option('--url <url>', 'Supabase URL')
  .option('--key <key>', 'Supabase Anon Key')
  .action(async (options) => {
    if (options.url || options.key) {
      await setConfig(options.url, options.key);
    } else {
      await getConfig();
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
