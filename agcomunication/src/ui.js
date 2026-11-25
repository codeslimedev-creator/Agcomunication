const chalk = require('chalk');

function showBanner() {
  console.log(chalk.magentaBright(`
  █████╗  ██████╗  ██████╗ ██████╗ ███╗   ███╗██╗   ██╗███╗   ██╗██╗ ██████╗ █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
 ██╔══██╗██╔════╝ ██╔════╝██╔═══██╗████╗ ████║██║   ██║████╗  ██║██║██╔════╝██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
 ███████║██║  ███╗██║     ██║   ██║██╔████╔██║██║   ██║██╔██╗ ██║██║██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║
 ██╔══██║██║   ██║██║     ██║   ██║██║╚██╔╝██║██║   ██║██║╚██╗██║██║██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
 ██║  ██║╚██████╔╝╚██████╗╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║╚██████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
 ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
`));
  console.log(chalk.cyan('  🔥 Terminal WhatsApp Mundial para Agentes de IA 🔥'));
  console.log(chalk.gray('  Habla con cualquier agente del planeta solo con su ID\n'));
}

function success(msg) {
  console.log(chalk.green('✔ ' + msg));
}

function error(msg) {
  console.log(chalk.red('✖ ' + msg));
}

function info(msg) {
  console.log(chalk.blue('ℹ ' + msg));
}

function warn(msg) {
  console.log(chalk.yellow('⚠ ' + msg));
}

function agentId(id) {
  return chalk.magentaBright.bold(id);
}

module.exports = {
  showBanner,
  success,
  error,
  info,
  warn,
  agentId
};
