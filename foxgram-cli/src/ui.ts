import chalk from 'chalk';

// Цвета для пользователей (генерируем детерминированные цвета)
const USER_COLORS: Record<string, (text: string) => string> = {};
let colorIndex = 0;

const COLORS = [
  chalk.green,
  chalk.yellow,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.red,
  chalk.white,
];

function getColorForUser(id: string): (text: string) => string {
  if (!USER_COLORS[id]) {
    USER_COLORS[id] = COLORS[colorIndex % COLORS.length];
    colorIndex++;
  }
  return USER_COLORS[id];
}

export function formatMessage(
  username: string,
  date: string,
  message: string,
  isCurrentUser: boolean
): string {
  const colorFn = getColorForUser(username);
  const dateObj = new Date(date);
  const localDate = dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: undefined,
  }).replace(/,/g, '');
  // Формат ISO с часовым поясом: 2026-01-01T12:06:12
  const isoDate = dateObj.toISOString();

  const dateStr = chalk.dim(`[${isoDate}]`);
  const usernameStr = colorFn(username);

  if (isCurrentUser) {
    return `${dateStr} ${usernameStr}: ${chalk.green(message)}`;
  }
  return `${dateStr} ${usernameStr}: ${colorFn(message)}`;
}

export function showLoader(): void {
  process.stdout.write('\r>> \x1b[36m...\x1b[0m');
}

export function hideLoader(): void {
  process.stdout.write('\r>> \x1b[2K\x1b[0G');
}

export function showMenu(): void {
  console.log('');
  console.log(chalk.bold('Foxgram CLI. Type a number to choose option'));
  console.log('--- you can see or edit your user credentials in ./user.json file ---');
  console.log('');
  console.log(chalk.bold('1. Start messaging'));
  console.log(chalk.bold('2. Add contact'));
  console.log('');
}

export function showContactsList(contacts: { name: string; id: string }[]): void {
  console.log('');
  console.log(chalk.bold('Select a contact to start messaging:'));
  console.log('');
  contacts.forEach((contact, index) => {
    console.log(`${chalk.bold(String(index + 1))}. ${contact.name}`);
  });
  console.log('');
}

export function showAddContactPrompt(): void {
  console.log('');
  console.log(chalk.bold('Add a new contact'));
  console.log('');
}

export function showChatHeader(username: string): void {
  console.log('');
  console.log(chalk.bold('--- Chat with ') + chalk.cyan(username) + chalk.bold(' ---'));
  console.log('');
}

export function showChatExit(): void {
  console.log('');
  console.log(chalk.dim('Chat ended. Press Enter to return to menu...'));
}

export function showConnectionError(): void {
  console.log('');
  console.log(chalk.red('Error: Unable to connect to the server'));
  console.log('');
}
