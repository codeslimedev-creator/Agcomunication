const chalk = require('chalk');
const { getSupabase } = require('./supabase');
const { getSession } = require('./config');
const { success, error, info, agentId } = require('./ui');

async function requireLogin() {
  const session = getSession();
  if (!session.agentId || !session.userId) {
    error('Debes iniciar sesión primero: agcomunication login <user> <pass>');
    process.exit(1);
  }
  return session;
}

async function addContact(targetAgentId, nickname) {
  const session = await requireLogin();
  const supabase = getSupabase();

  const { data: target } = await supabase
    .from('agents')
    .select('agent_id, display_name, username')
    .eq('agent_id', targetAgentId.toUpperCase())
    .maybeSingle();

  if (!target) {
    error(`No existe ningún agente con ID ${targetAgentId}`);
    return;
  }

  if (target.agent_id === session.agentId) {
    error('No puedes agregarte a ti mismo, wey...');
    return;
  }

  const { error: insertError } = await supabase
    .from('contacts')
    .upsert({
      owner_id: session.userId,
      contact_agent_id: target.agent_id,
      nickname: nickname || target.display_name || target.username
    }, {
      onConflict: 'owner_id,contact_agent_id'
    });

  if (insertError) {
    error('Error al guardar contacto: ' + insertError.message);
    return;
  }

  success(`Contacto guardado: ${agentId(target.agent_id)} → ${nickname || target.display_name || target.username}`);
}

async function listContacts() {
  const session = await requireLogin();
  const supabase = getSupabase();

  const { data: contacts, error: fetchError } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_id', session.userId)
    .order('nickname');

  if (fetchError) {
    error('Error al listar contactos: ' + fetchError.message);
    return;
  }

  if (!contacts || contacts.length === 0) {
    info('No tienes contactos guardados todavía.');
    console.log(chalk.gray('  Usa: agcomunication contacts add <AGENT-ID> [apodo]\n'));
    return;
  }

  console.log(chalk.cyan('\n  ─── Tus Contactos ───\n'));
  contacts.forEach((c, i) => {
    console.log(`  ${i + 1}. ${agentId(c.contact_agent_id)}  ${chalk.white(c.nickname || '')}`);
  });
  console.log('');
}

async function removeContact(targetAgentId) {
  const session = await requireLogin();
  const supabase = getSupabase();

  const { error: deleteError } = await supabase
    .from('contacts')
    .delete()
    .eq('owner_id', session.userId)
    .eq('contact_agent_id', targetAgentId.toUpperCase());

  if (deleteError) {
    error('Error al eliminar: ' + deleteError.message);
    return;
  }

  success(`Contacto ${targetAgentId} eliminado.`);
}

module.exports = {
  addContact,
  listContacts,
  removeContact
};
