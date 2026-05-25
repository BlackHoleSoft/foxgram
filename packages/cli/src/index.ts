#!/usr/bin/env node

/**
 * Foxgram CLI — entry point.
 *
 * Команды:
 *   foxgram login          — открыть экран входа
 *   foxgram register       — открыть экран регистрации
 *   foxgram chat <username> — открыть чат с пользователем
 *   foxgram logout         — выйти и очистить локальные данные
 */

import { loadCliConfig } from './config';

const config = loadCliConfig();

console.log('Foxgram CLI v1.0.0');
console.log(`Server: ${config.serverUrl}`);
console.log(`Home:   ${config.homeDir}`);
console.log('');
console.log('Usage: foxgram <command>');
console.log('');
console.log('Commands:');
console.log('  login          Open login screen');
console.log('  register       Open registration screen');
console.log('  chat <username> Open chat with user');
console.log('  logout         Logout and clear local data');
