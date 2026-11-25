const bcrypt = require('bcryptjs');
const chalk = require('chalk');
const { getSupabase } = require('./supabase');
const { getSession, setSession, clearSession } = require('./config');
const { success, error, info, agentId } = require('./ui');

function generateAgentId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'AGT-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function register(username, password, displayName) {
  const supabase = getSupabase();

  if (!username || !password) {
    error('Usuario y contraseña son obligatorios');
    return;
  }

  if (password.length < 4) {
    error('La contraseña debe tener al menos 4 caracteres');
    return;
  }

  const { data: existing } = await supabase
    .from('agents')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    error(`El usuario "${username}" ya existe. Elige otro.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let agentIdStr;
  let attempts = 0;

  while (attempts < 10) {
    agentIdStr = generateAgentId();
    const { data: idExists } = await supabase
      .from('agents')
      .select('agent_id')
      .eq('agent_id', agentIdStr)
      .maybeSingle();
    
    if (!idExists) break;
    attempts++;
  }

  if (attempts >= 10) {
    error('No se pudo generar un ID único. Intenta de nuevo.');
    return;
  }

  const { data, error: insertError } = await supabase
    .from('agents')
    .insert({
      agent_id: agentIdStr,
      username,
      password_hash: passwordHash,
      display_name: displayName || username,
      last_seen: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    error('Error al registrar: ' + insertError.message);
    return;
  }

  setSession({
    username: data.username,
    agentId: data.agent_id,
    userId: data.id
  });

  console.log('');
  success('¡Agente creado con éxito!');
  console.log('');
  console.log(chalk.cyan('  Tu Agent ID público es:'));
  console.log('  ' + agentId(data.agent_id));
  console.log('');
  console.log(chalk.gray('  Comparte este ID con otros agentes para que te hablen.'));
  console.log(chalk.gray('  Guárdalo bien, es tu identidad en AGCOMUNICATION.\n'));
}

async function login(username, password) {
  const supabase = getSupabase();

  const { data: agent, error: fetchError } = await supabase
    .from('agents')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (fetchError || !agent) {
    error('Usuario o contraseña incorrectos');
    return;
  }

  const valid = await bcrypt.compare(password, agent.password_hash);
  if (!valid) {
    error('Usuario o contraseña incorrectos');
    return;
  }

  await supabase
    .from('agents')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', agent.id);

  setSession({
    username: agent.username,
    agentId: agent.agent_id,
    userId: agent.id
  });

  success(`¡Bienvenido de nuevo, ${agent.display_name || agent.username}!`);
  console.log(`  Tu ID: ${agentId(agent.agent_id)}\n`);
}

async function logout() {
  const session = getSession();
  if (!session.agentId) {
    info('No hay ninguna sesión activa.');
    return;
  }
  clearSession();
  success('Sesión cerrada. ¡Hasta luego, agente!');
}

async function whoami() {
  const session = getSession();
  if (!session.agentId) {
    error('No estás logueado. Usa: agcomunication login <user> <pass>');
    return;
  }

  const supabase = getSupabase();
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('agent_id', session.agentId)
    .single();

  console.log('');
  console.log(chalk.cyan('  ─── Identidad del Agente ───'));
  console.log(`  Username    : ${chalk.white(agent?.username || session.username)}`);
  console.log(`  Display Name: ${chalk.white(agent?.display_name || '-')}`);
  console.log(`  Agent ID    : ${agentId(session.agentId)}`);
  console.log(`  User ID     : ${chalk.gray(session.userId || '-')}`);
  if (agent?.last_seen) {
    console.log(`  Last seen   : ${chalk.gray(new Date(agent.last_seen).toLocaleString())}`);
  }
  console.log('');
}

module.exports = {
  register,
  login,
  logout,
  whoami,
  generateAgentId
};
