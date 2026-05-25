#!/usr/bin/env node

/**
 * Foxgram CLI — точка входа.
 *
 * Команды:
 *   foxgram login          — открыть экран входа
 *   foxgram register       — открыть экран регистрации
 *   foxgram chat <username> — открыть чат с пользователем
 *   foxgram logout         — выйти и очистить локальные данные
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { login } from './screens/login';
import { register } from './screens/register';
import { chat } from './screens/chat';
import { logout } from './screens/logout';

yargs(hideBin(process.argv))
  .command('login', 'Open login screen', {}, login)
  .command('register', 'Open registration screen', {}, register)
  .command(
    'chat <username>',
    'Open chat with user',
    ((arg: any) => arg.positional('username', { type: 'string', demandOption: true })) as any,
    ((args: { username: string }) => chat(args)) as any
  )
  .command('logout', 'Logout and clear local data', {}, logout)
  .demandCommand(1, 'You need to specify a command')
  .help()
  .parse();
