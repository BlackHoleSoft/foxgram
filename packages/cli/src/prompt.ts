import * as readline from 'readline';

/**
 * Единственный readline.Interface на весь процесс.
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Закрыть readline interface.
 */
export function closePrompt(): void {
  rl.close();
}

/**
 * Вывести "label: " и вернуть ввод пользователя.
 */
export function ask(label: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(label + ' ', (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Вывести "label: " (без echo), вернуть ввод.
 * Реализовать через mute/unmute с process.stdout.write.
 *
 * Если stdin не является TTY (пайплайн, перенаправление),
 * используется fallback — обычный ask() с предупреждением.
 */
export function password(label: string): Promise<string> {
  // Fallback для нетTY-сред
  if (!process.stdin.isTTY) {
    process.stderr.write('⚠ stdin is not a TTY — password will be visible\n');
    return ask(label);
  }

  return new Promise((resolve) => {
    process.stdout.write(label + ': ');

    const onData = (data: Buffer) => {
      const input = data.toString().trim();
      cleanup();
      // Выводим перевод строки, чтобы курсор переместился на новую строку
      process.stdout.write('\n');
      resolve(input);
    };

    const onExit = () => {
      cleanup();
      resolve('');
    };

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.removeListener('end', onExit);
      // Включаем echo обратно
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    try {
      // Отключаем echo
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', onData);
      process.stdin.once('end', onExit);
    } catch (err) {
      // setRawMode может выбросить, если stdin повреждён
      cleanup();
      process.stderr.write(`⚠ Failed to set raw mode: ${(err as Error).message}\n`);
      resolve('');
    }
  });
}

/**
 * Вывести "label (0-max): ", принять и валидировать число в диапазоне [0, max].
 * При невалидном вводе повторять запрос.
 */
export async function choose(label: string, max: number): Promise<number> {
  while (true) {
    const input = await ask(`${label} (0-${max}):`);
    const num = Number(input);
    if (Number.isInteger(num) && num >= 0 && num <= max) {
      return num;
    }
    // При невалидном вводе — повторный запрос (просто выводим сообщение)
    process.stdout.write(`Введите число от 0 до ${max}\n`);
  }
}

/**
 * Вывести "label (y/N): ", вернуть true если ввод "y" или "Y".
 */
export async function confirm(label: string): Promise<boolean> {
  const input = await ask(`${label} (y/N):`);
  return input === 'y' || input === 'Y';
}
