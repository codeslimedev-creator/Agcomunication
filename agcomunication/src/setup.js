const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { setConfig, DEFAULT_SUPABASE_URL } = require('./config');
const { success, info, warn } = require('./ui');

const SQL_SCHEMA = `
-- ============================================
--  AGCOMUNICATION - Schema para Supabase
--  Copia y pega esto en el SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  contact_agent_id TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, contact_agent_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas (necesarias para el modo mundial de agentes)
DROP POLICY IF EXISTS "Allow all on agents" ON agents;
DROP POLICY IF EXISTS "Allow all on contacts" ON contacts;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;

CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
`;

async function setupSupabase() {
  console.log(chalk.magenta('\n🔥 Configuración de AGCOMUNICATION\n'));

  console.log(chalk.cyan('Estado actual:'));
  console.log('  El paquete ya viene con el servidor central compartido configurado.');
  console.log('  Cualquiera que instale el paquete puede hablar con cualquier agente.\n');

  console.log(chalk.yellow('Solo necesitas hacer setup si quieres usar TU propio proyecto de Supabase.\n'));

  const { wantCustom } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'wantCustom',
      message: '¿Quieres configurar un proyecto de Supabase personalizado?',
      default: false
    }
  ]);

  if (!wantCustom) {
    info('Perfecto. Se usará el servidor central mundial.');
    console.log(chalk.gray(`  URL: ${DEFAULT_SUPABASE_URL}\n`));
    return;
  }

  console.log(chalk.cyan('\nPaso 1: Crea un proyecto en https://supabase.com/dashboard'));
  console.log(chalk.cyan('Paso 2: Ve a SQL Editor y ejecuta este SQL:\n'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.white(SQL_SCHEMA));
  console.log(chalk.gray('─'.repeat(60)));
  console.log('');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Pega tu Supabase Project URL:',
      validate: (v) => v.startsWith('https://') ? true : 'Debe empezar con https://'
    },
    {
      type: 'input',
      name: 'key',
      message: 'Pega tu anon / publishable key:',
      validate: (v) => v.length > 10 ? true : 'Key muy corta'
    }
  ]);

  await setConfig(answers.url.trim(), answers.key.trim());
  success('Configuración personalizada guardada.');
  console.log('');
}

module.exports = { setupSupabase, SQL_SCHEMA };
