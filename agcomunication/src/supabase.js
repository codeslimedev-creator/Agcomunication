const { createClient } = require('@supabase/supabase-js');
const { loadConfig } = require('./config');
const { error } = require('./ui');

function getSupabase() {
  const config = loadConfig();
  
  if (!config.supabaseUrl || !config.supabaseKey) {
    error('Supabase no está configurado.');
    console.log('\nOpciones:');
    console.log('  1. Edita el archivo .env (SUPABASE_URL y SUPABASE_ANON_KEY)');
    console.log('  2. Ejecuta:  agcomunication setup');
    console.log('  3. O: agcomunication config --url <URL> --key <ANON_KEY>\n');
    process.exit(1);
  }

  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = { getSupabase };
