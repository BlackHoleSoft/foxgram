import { AppState, Screen } from '../state';
import { printSection, printError, printSuccess, printSeparator } from '../renderer';
import { ask, password } from '../prompt';

/**
 * Экран: вход пользователя.
 *
 * Выводит:
 *   ── Login ──────────────────
 *
 *   Username: _
 *   Password: _
 *
 *   Logging in...
 *   ✓ Welcome, alice!
 *
 * @param state — состояние приложения
 * @returns экран для перехода (contact-list или auth-menu)
 */
export async function login(state: AppState): Promise<Screen> {
  printSection('Login');
  printSeparator();

  const username = await ask('Username');

  // Валидация: пустой username недопустим
  if (!username) {
    printError('Username cannot be empty');
    return 'login';
  }

  const pwd = await password('Password');

  console.log('Logging in...');

  try {
    await state.foxgram.login(username, pwd);
    printSuccess(`Welcome, ${username}!`);
    return 'contact-list';
  } catch (err) {
    const message = (err as Error).message;
    printError(message);

    // Проверка по коду ошибки, а не по тексту
    if ((err as { code?: string }).code === 'NO_SECRET_KEY') {
      console.log('Register first on this device.');
    }

    return 'auth-menu';
  }
}
