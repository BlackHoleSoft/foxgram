import { AppState, Screen } from '../state';
import { printSection, printError, printSuccess, printSeparator } from '../renderer';
import { ask, password } from '../prompt';

/**
 * Экран: регистрация нового пользователя.
 *
 * Выводит:
 *   ── Register ────────────────
 *
 *   Username: _
 *   Password (min 8 chars): _
 *   Private key (optional, base64url 32 bytes): _
 *     [leave empty to generate automatically]
 *
 *   Registering...
 *   ✓ Registered as alice. Public key: <base64url>
 *
 * @param state — состояние приложения
 * @returns экран для перехода (contact-list или auth-menu)
 */
export async function register(state: AppState): Promise<Screen> {
  printSection('Register');
  printSeparator();

  const username = await ask('Username');

  // Валидация: пустой username недопустим
  if (!username) {
    printError('Username cannot be empty');
    return 'register';
  }

  const pwd = await password('Password (min 8 chars)');

  // Подсказка: оставить пустым для автогенерации
  console.log('  [leave empty to generate automatically]');
  const secretKey = await ask('Private key (optional, base64url 32 bytes)');

  // Валидация формата private key если он указан
  if (secretKey) {
    const isValid = isValidBase64Url(secretKey, 32);
    if (!isValid) {
      printError('Invalid key format. Use 32 bytes base64url.');
      return 'register';
    }
  }

  // Если поле пустое — считаем что пользователь хочет автогенерацию
  const privateKey = secretKey || undefined;

  console.log('Registering...');

  try {
    await state.foxgram.register(username, pwd, privateKey);
    const publicKey = state.foxgram.getPublicKey();
    printSuccess(`Registered as ${username}. Public key: ${publicKey || '<not available>'}`);
    return 'contact-list';
  } catch (err) {
    const message = (err as Error).message;
    printError(message);
    return 'auth-menu';
  }
}

/**
 * Проверяет, что строка является валидным base64url и имеет заданную длину в байтах.
 */
function isValidBase64Url(input: string, expectedBytes: number): boolean {
  // base64url без padding: длина строки должна быть кратна 4
  if (input.length === 0 || input.length % 4 !== 0) {
    return false;
  }

  // Проверка на допустимые символы base64url: A-Z, a-z, 0-9, -, _
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  if (!base64urlRegex.test(input)) {
    return false;
  }

  // Проверка длины в байтах: base64url encodes 6 bits per char
  const expectedLength = (expectedBytes * 4) / 3;
  // Для 32 байт: 32 * 4 / 3 = 42.67 → 43 символа base64url
  if (input.length !== expectedLength) {
    return false;
  }

  // Дополнительная проверка: декодирование
  try {
    const decoded = Buffer.from(input, 'base64url');
    return decoded.length === expectedBytes;
  } catch {
    return false;
  }
}
