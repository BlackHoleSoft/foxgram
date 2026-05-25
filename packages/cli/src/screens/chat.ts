/**
 * Экран чата с пользователем.
 *
 * CL002.2.4 указывает сигнатуру chat(username: string), но yargs-хендлеры
 * получают объект аргументов, а не позиционные параметры напрямую.
 * Поэтому сигнатура — chat(args: { username: string }), как требует yargs.
 *
 * Реализуется в CL006.
 */

export async function chat(args: { username: string }): Promise<void> {
  console.log(`Chat with "${args.username}" coming soon`);
}
