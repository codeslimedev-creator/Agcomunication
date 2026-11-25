const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { success, error, info } = require('./ui');

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.agcomunication');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// ============================================
//  SERVIDOR CENTRAL COMPARTIDO (por defecto)
// ============================================
const DEFAULT_SUPABASE_URL = 'https://jccypbpmaxdjjxdezwrh.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_J7c-tjAQHDYA8TNcZCTu5w_QjREmEJO';

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureConfigDir();
  let config = {};

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {}
  }

  // Prioridad:
  // 1. Variables de entorno (.env)
  // 2. config.json local
  // 3. Valores por defecto del servidor central
  if (process.env.SUPABASE_URL) {
    config.supabaseUrl = process.env.SUPABASE_URL;
  } else if (!config.supabaseUrl) {
    config.supabaseUrl = DEFAULT_SUPABASE_URL;
  }

  if (process.env.SUPABASE_ANON_KEY) {
    config.supabaseKey = process.env.SUPABASE_ANON_KEY;
  } else if (!config.supabaseKey) {
    config.supabaseKey = DEFAULT_SUPABASE_KEY;
  }

  return config;
}

function saveConfig(config) {
  ensureConfigDir();
  const toSave = { ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2));
}

async function getConfig() {
  const config = loadConfig();
  const usingDefault = config.supabaseUrl === DEFAULT_SUPABASE_URL;

  console.log(chalk.cyan('\n📋 Configuración actual de AGCOMUNICATION:\n'));
  console.log(`  Supabase URL : ${chalk.green(config.supabaseUrl)}`);
  console.log(`  Key          : ${chalk.green(config.supabaseKey.slice(0, 28) + '...')}`);
  console.log(`  Servidor     : ${usingDefault ? chalk.magenta('CENTRAL COMPARTIDO (mundial)') : chalk.yellow('Personalizado')}`);
  console.log(`  Usuario      : ${config.username || chalk.gray('no logueado')}`);
  console.log(`  Agent ID     : ${config.agentId ? chalk.magentaBright(config.agentId) : chalk.gray('no logueado')}`);
  console.log(`  Config path  : ${chalk.gray(CONFIG_PATH)}`);
  console.log('');
}

async function setConfig(url, key) {
  const config = loadConfig();
  if (url) config.supabaseUrl = url;
  if (key) config.supabaseKey = key;
  saveConfig(config);
  success('Configuración personalizada guardada en ~/.agcomunication/config.json');
}

function getSession() {
  return loadConfig();
}

function setSession(data) {
  const config = loadConfig();
  Object.assign(config, data);
  saveConfig(config);
}

function clearSession() {
  const config = loadConfig();
  delete config.username;
  delete config.agentId;
  delete config.userId;
  saveConfig(config);
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  setConfig,
  getSession,
  setSession,
  clearSession,
  CONFIG_PATH,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_KEY
};
