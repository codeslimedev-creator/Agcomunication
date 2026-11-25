const readline = require('readline');
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

async function sendMessage(toAgentId, content) {
  const session = await requireLogin();
  const supabase = getSupabase();

  toAgentId = toAgentId.toUpperCase();

  if (!content || !content.trim()) {
    error('El mensaje no puede estar vacío');
    return;
  }

  const { data: target } = await supabase
    .from('agents')
    .select('agent_id, display_name')
    .eq('agent_id', toAgentId)
    .maybeSingle();

  if (!target) {
    error(`No existe el agente ${toAgentId}`);
    return;
  }

  const { error: insertError } = await supabase
    .from('messages')
    .insert({
      from_agent_id: session.agentId,
      to_agent_id: toAgentId,
      content: content.trim()
    });

  if (insertError) {
    error('Error al enviar mensaje: ' + insertError.message);
    return;
  }

  success(`Mensaje enviado a ${agentId(toAgentId)}`);
}

async function listMessages(onlyUnread = false) {
  const session = await requireLogin();
  const supabase = getSupabase();

  let query = supabase
    .from('messages')
    .select('*')
    .eq('to_agent_id', session.agentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (onlyUnread) {
    query = query.eq('read', false);
  }

  const { data: messages, error: fetchError } = await query;

  if (fetchError) {
    error('Error al obtener mensajes: ' + fetchError.message);
    return;
  }

  if (!messages || messages.length === 0) {
    info(onlyUnread ? 'No tienes mensajes sin leer.' : 'Tu bandeja de entrada está vacía.');
    return;
  }

  console.log(chalk.cyan(`\n  ─── Inbox (${messages.length}) ───\n`));

  for (const msg of messages.reverse()) {
    const time = new Date(msg.created_at).toLocaleString();
    const from = agentId(msg.from_agent_id);
    const readMark = msg.read ? chalk.gray('✓') : chalk.yellow('●');
    console.log(`${readMark} ${chalk.gray(time)}  ${from}`);
    console.log(`   ${chalk.white(msg.content)}\n`);
  }

  const ids = messages.filter(m => !m.read).map(m => m.id);
  if (ids.length > 0) {
    await supabase
      .from('messages')
      .update({ read: true })
      .in('id', ids);
  }
}

async function startChat(targetAgentId) {
  const session = await requireLogin();
  const supabase = getSupabase();
  targetAgentId = targetAgentId.toUpperCase();

  const { data: target } = await supabase
    .from('agents')
    .select('agent_id, display_name, username')
    .eq('agent_id', targetAgentId)
    .maybeSingle();

  if (!target) {
    error(`No existe el agente ${targetAgentId}`);
    return;
  }

  if (target.agent_id === session.agentId) {
    error('No puedes chatear contigo mismo... aunque sea tentador.');
    return;
  }

  const targetName = target.display_name || target.username || target.agent_id;

  console.log('');
  console.log(chalk.magenta('══════════════════════════════════════════════'));
  console.log(chalk.magenta(`  CHAT con ${agentId(target.agent_id)} (${targetName})`));
  console.log(chalk.magenta('══════════════════════════════════════════════'));
  console.log(chalk.gray('  Escribe tu mensaje y presiona Enter'));
  console.log(chalk.gray('  Comandos: /history  /exit  /clear\n'));

  await loadHistory(session.agentId, target.agent_id);

  const channel = supabase
    .channel(`chat-${session.agentId}-${target.agent_id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `to_agent_id=eq.${session.agentId}`
      },
      (payload) => {
        const msg = payload.new;
        if (msg.from_agent_id === target.agent_id) {
          const time = new Date(msg.created_at).toLocaleTimeString();
          console.log(`\n${chalk.green('←')} ${chalk.gray(time)} ${agentId(msg.from_agent_id)}`);
          console.log(`  ${chalk.white(msg.content)}`);
          process.stdout.write(chalk.cyan('tú > '));
          
          supabase.from('messages').update({ read: true }).eq('id', msg.id).then(() => {});
        }
      }
    )
    .subscribe();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('tú > ')
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const text = line.trim();

    if (!text) {
      rl.prompt();
      return;
    }

    if (text === '/exit' || text === '/quit') {
      console.log(chalk.gray('\nSaliendo del chat...'));
      await supabase.removeChannel(channel);
      rl.close();
      process.exit(0);
    }

    if (text === '/history') {
      await loadHistory(session.agentId, target.agent_id);
      rl.prompt();
      return;
    }

    if (text === '/clear') {
      console.clear();
      console.log(chalk.magenta(`CHAT con ${agentId(target.agent_id)} (${targetName})\n`));
      rl.prompt();
      return;
    }

    const { error: sendError } = await supabase
      .from('messages')
      .insert({
        from_agent_id: session.agentId,
        to_agent_id: target.agent_id,
        content: text
      });

    if (sendError) {
      error('No se pudo enviar: ' + sendError.message);
    } else {
      const time = new Date().toLocaleTimeString();
      console.log(`${chalk.blue('→')} ${chalk.gray(time)} ${chalk.cyan('tú')}`);
      console.log(`  ${text}`);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    await supabase.removeChannel(channel);
    process.exit(0);
  });
}

async function loadHistory(myId, otherId) {
  const supabase = getSupabase();

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`and(from_agent_id.eq.${myId},to_agent_id.eq.${otherId}),and(from_agent_id.eq.${otherId},to_agent_id.eq.${myId})`)
    .order('created_at', { ascending: true })
    .limit(30);

  if (!messages || messages.length === 0) {
    console.log(chalk.gray('  (sin mensajes previos)\n'));
    return;
  }

  console.log(chalk.gray('  ── historial reciente ──'));
  for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const isMe = msg.from_agent_id === myId;
    if (isMe) {
      console.log(`${chalk.blue('→')} ${chalk.gray(time)} ${chalk.cyan('tú')}`);
    } else {
      console.log(`${chalk.green('←')} ${chalk.gray(time)} ${agentId(msg.from_agent_id)}`);
    }
    console.log(`  ${msg.content}`);
  }
  console.log(chalk.gray('  ────────────────────────\n'));
}

module.exports = {
  sendMessage,
  listMessages,
  startChat
};
