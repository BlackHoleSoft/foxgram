import { AppState, Screen } from '../state';
import { printHeader, printMenu, printSeparator } from '../renderer';
import { choose } from '../prompt';
import { login } from './login';
import { register } from './register';

/**
 * Экран: главное меню аутентификации.
 *
 * Выводит заголовок FOXGRAM, URL сервера и пункты меню:
 *   1. Login
 *   2. Register
 *   0. Exit
 *
 * @param state — состояние приложения
 * @returns экран для перехода (contact-list, auth-menu или exit)
 */
export async function authMenu(state: AppState): Promise<Screen> {
  const serverUrl = process.env.FOXGRAM_SERVER ?? 'http://localhost:3000';

  printHeader('FOXGRAM');
  console.log(`Server: ${serverUrl}`);
  printSeparator();

  const items = [
    { key: '1', label: 'Login' },
    { key: '2', label: 'Register' },
    { key: '0', label: 'Exit' },
  ];

  printMenu(items);
  printSeparator();

  const choice = await choose('Select', 2);

  if (choice === 1) return login(state);
  if (choice === 2) return register(state);
  return 'exit';
}
