const BACKEND_URL = process.env.FOXGRAM_BACKEND_URL || 'http://localhost:3666';

export interface MessageResponse {
  receiver: string;
  sender: string;
  payload: string;
  createDate: string;
}

export interface MessagesApiResponse {
  total: number;
  messages: MessageResponse[];
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  payload: string
): Promise<boolean> {
  const response = await fetch(`${BACKEND_URL}/api/v1/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: senderId,
      receiver: receiverId,
      payload,
    }),
  });

  return response.ok;
}

export async function getMessages(
  receiverId: string,
  senderId: string,
  start: number = 0,
  count: number = 100
): Promise<MessagesApiResponse | null> {
  const params ={
    receiver: receiverId,
    sender: senderId,
    start: start,
    count: count,
  };  

  const response = await fetch(`${BACKEND_URL}/api/v1/messages/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  // console.log('Fetch messages:', params, response.status);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as unknown as MessagesApiResponse;
  return data;
}

export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delayMs: number = 3000
): Promise<T> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
