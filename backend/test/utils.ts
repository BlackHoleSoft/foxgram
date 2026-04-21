export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTestMessageId(index: number): string {
  return `message-${index.toString().padStart(3, '0')}`;
}

export function generateTestUsername(index: number): string {
  return `testuser-${index}`;
}

export function generateTestPayload(index: number): string {
  return `Test message payload ${index}`;
}