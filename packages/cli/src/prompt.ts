import * as readline from 'readline';
import { password as inquirerPassword, input as inquirerInput, confirm as inquirerConfirm } from '@inquirer/prompts';

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
  return inquirerInput({
    message: label + ':',    
  })
}

/**
 * Вывести "label: " (без echo), вернуть ввод.
 * Использует @inquirer/prompts для надёжного ввода пароля.
 */
export function password(label: string): Promise<string> {
  return inquirerPassword({
    message: label + ':',
    mask: '○'
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
  return inquirerConfirm({
    message: label + ':'
  });
}
