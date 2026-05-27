import chalk from 'chalk';
import { DecryptedMessage } from 'foxgram-core';

/**
 * Выводит заголовок в рамке:
 * ╔══════╗
 * ║ title ║
 * ╚══════╝
 */
export function printHeader(title: string): void {
  const width = title.length + 4;
  const border = '═'.repeat(width);
  console.log(chalk.cyan(`╔${border}╗`));
  console.log(chalk.cyan(`║`) + ` ${title} ` + chalk.cyan(`║`));
  console.log(chalk.cyan(`╚${border}╝`));
}

/**
 * Выводит заголовок секции: ── title ─────────────
 */
export function printSection(title: string): void {
  // Минимальная длина рамки: "── title ──" = title.length + 8,
  // но не менее 10 символов для видимости рамки.
  const minWidth = Math.max(title.length + 8, 10);
  const border = '─'.repeat(minWidth);
  console.log(chalk.bold(`── ${title} ──`) + border.substring(title.length + 8));
}

/**
 * Выводит нумерованное меню:
 *   1. label
 *   2. label
 */
export function printMenu(items: { key: string; label: string }[]): void {
  for (const item of items) {
    console.log(chalk.white(`  ${item.key}. ${item.label}`));
  }
}

/**
 * Выводит ошибку красным цветом.
 */
export function printError(msg: string): void {
  console.log(chalk.red(msg));
}

/**
 * Выводит сообщение об успехе зелёным цветом.
 */
export function printSuccess(msg: string): void {
  console.log(chalk.green(msg));
}

/**
 * Выводит строку-разделитель.
 *
 * @param char — символ разделителя. Если не передан, выводит пустую строку.
 *               Если передан — выводит линию из этого символа на всю ширину терминала.
 */
export function printSeparator(char?: string): void {
  if (char) {
    const width = process.stdout.columns ?? 80;
    console.log(char.repeat(width));
  } else {
    console.log();
  }
}

/**
 * Форматирует и выводит одно сообщение.
 *
 * Формат: [HH:MM] username: content
 * Исходящие (msg.senderId === myUserId): chalk.cyan
 * Входящие: chalk.white
 *
 * @param msg — расшифрованное сообщение
 * @param myUserId — userId текущего пользователя
 * @param senderName — имя отправителя (если не передано, для исходящих используется 'вы')
 */
export function printMessage(msg: DecryptedMessage, myUserId: string, senderName?: string): void {
  const date = new Date(msg.timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const timestamp = `[${hh}:${mm}]`;

  const isOutgoing = msg.senderId === myUserId;
  const name = senderName ?? (isOutgoing ? 'вы' : '');
  const prefix = isOutgoing
    ? chalk.cyan(`${timestamp} ${name}: `)
    : chalk.white(`${timestamp} ${name}  `);

  console.log(prefix + (isOutgoing ? chalk.cyan(msg.content) : msg.content));
}
