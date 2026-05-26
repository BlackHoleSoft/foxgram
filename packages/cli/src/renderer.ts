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
 * Выводит пустую строку-разделитель.
 */
export function printSeparator(): void {
  console.log();
}

/**
 * Форматирует и выводит одно сообщение.
 *
 * Формат: [HH:MM] username: content
 * Исходящие (msg.senderId === myUserId): chalk.cyan
 * Входящие: chalk.white
 */
export function printMessage(msg: DecryptedMessage, myUserId: string): void {
  const date = new Date(msg.timestamp);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const timestamp = `[${hh}:${mm}]`;

  const isOutgoing = msg.senderId === myUserId;
  const prefix = isOutgoing ? chalk.cyan(`${timestamp} вы: `) : chalk.white(`${timestamp} `);

  console.log(prefix + (isOutgoing ? chalk.cyan(msg.content) : msg.content));
}
