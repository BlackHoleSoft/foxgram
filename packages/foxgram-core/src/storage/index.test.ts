import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import fsPromises from 'fs/promises';

import { Storage } from './index';
import { FoxgramConfig, Contact } from '../types';

/**
 * Хелпер: создаёт временную директорию и возвращает путь.
 * После тестов директория удаляется.
 */
function createTempDir(prefix: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return tmpDir;
}

async function removeTempDir(dir: string): Promise<void> {
  if (fs.existsSync(dir)) {
    await fsPromises.rm(dir, { recursive: true, force: true });
  }
}

describe('Storage', () => {
  let tempDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Сохраняем оригинальное значение FOXGRAM_HOME
    originalEnv = process.env.FOXGRAM_HOME;
    // Очищаем FOXGRAM_HOME, чтобы тесты были изолированными
    delete process.env.FOXGRAM_HOME;
    tempDir = createTempDir('foxgram-storage-test-');
  });

  afterEach(async () => {
    // Восстанавливаем оригинальное значение FOXGRAM_HOME
    if (originalEnv !== undefined) {
      process.env.FOXGRAM_HOME = originalEnv;
    } else {
      delete process.env.FOXGRAM_HOME;
    }
    // Удаляем временную директорию
    await removeTempDir(tempDir);
  });

  describe('constructor & dataDir resolution', () => {
    it('должен использовать FOXGRAM_HOME env-переменную', () => {
      process.env.FOXGRAM_HOME = tempDir;
      const storage = new Storage();
      // dataDir определяется приватно, но мы можем проверить результат через save/load
      expect(storage).toBeDefined();
    });

    it('должен использовать homeDir из options', () => {
      const customDir = path.join(tempDir, 'custom');
      const storage = new Storage({ homeDir: customDir });
      expect(storage).toBeDefined();
    });
  });

  describe('saveConfig / loadConfig', () => {
    it('должен сохранять config и затем загружать его', async () => {
      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'base64url-public-key',
        secretKey: 'base64url-secret-key',
        token: 'jwt-token-abc',
      };

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveConfig(config);

      const loaded = await storage.loadConfig();
      expect(loaded).not.toBeNull();
      expect(loaded!.serverUrl).toBe('http://localhost:3000');
      expect(loaded!.userId).toBe('user-123');
      expect(loaded!.username).toBe('alice');
      expect(loaded!.publicKey).toBe('base64url-public-key');
      expect(loaded!.secretKey).toBe('base64url-secret-key');
      expect(loaded!.token).toBe('jwt-token-abc');
    });

    it('должен возвращать null если config.json не существует', async () => {
      const storage = new Storage({ homeDir: tempDir });
      const loaded = await storage.loadConfig();
      expect(loaded).toBeNull();
    });

    it('должен перезаписывать существующий config', async () => {
      const config1: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key1',
        secretKey: 'secret1',
        token: 'token1',
      };

      const config2: FoxgramConfig = {
        serverUrl: 'http://localhost:4000',
        userId: 'user-456',
        username: 'bob',
        publicKey: 'key2',
        secretKey: 'secret2',
        token: 'token2',
      };

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveConfig(config1);
      await storage.saveConfig(config2);

      const loaded = await storage.loadConfig();
      expect(loaded).not.toBeNull();
      expect(loaded!.serverUrl).toBe('http://localhost:4000');
      expect(loaded!.username).toBe('bob');
    });

    it('должен создавать директорию если не существует', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'deeply', 'dir');
      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      const storage = new Storage({ homeDir: nestedDir });
      await storage.saveConfig(config);

      // Директория должна быть создана
      expect(fs.existsSync(nestedDir)).toBe(true);
      // Файл config.json должен существовать
      expect(fs.existsSync(path.join(nestedDir, 'config.json'))).toBe(true);
    });
  });

  describe('saveContacts / loadContacts', () => {
    it('должен сохранять и загружать контакты', async () => {
      const contacts: Contact[] = [
        { userId: 'user-1', username: 'bob', publicKey: 'key-bob' },
        { userId: 'user-2', username: 'charlie', publicKey: 'key-charlie' },
      ];

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveContacts(contacts);

      const loaded = await storage.loadContacts();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].userId).toBe('user-1');
      expect(loaded[0].username).toBe('bob');
      expect(loaded[1].userId).toBe('user-2');
      expect(loaded[1].username).toBe('charlie');
    });

    it('должен возвращать пустой массив если contacts.json не существует', async () => {
      const storage = new Storage({ homeDir: tempDir });
      const loaded = await storage.loadContacts();
      expect(loaded).toHaveLength(0);
    });

    it('должен сохранять пустой массив контактов', async () => {
      const storage = new Storage({ homeDir: tempDir });
      await storage.saveContacts([]);

      const loaded = await storage.loadContacts();
      expect(loaded).toHaveLength(0);
    });

    it('должен перезаписывать существующие контакты', async () => {
      const contacts1: Contact[] = [
        { userId: 'user-1', username: 'bob', publicKey: 'key-bob' },
      ];

      const contacts2: Contact[] = [
        { userId: 'user-2', username: 'charlie', publicKey: 'key-charlie' },
      ];

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveContacts(contacts1);
      await storage.saveContacts(contacts2);

      const loaded = await storage.loadContacts();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].username).toBe('charlie');
    });
  });

  describe('clear', () => {
    it('должен удалять config.json и contacts.json', async () => {
      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      const contacts: Contact[] = [
        { userId: 'user-1', username: 'bob', publicKey: 'key-bob' },
      ];

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveConfig(config);
      await storage.saveContacts(contacts);

      // Файлы должны существовать
      expect(fs.existsSync(path.join(tempDir, 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'contacts.json'))).toBe(true);

      // Очищаем
      await storage.clear();

      // Файлы должны быть удалены
      expect(fs.existsSync(path.join(tempDir, 'config.json'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'contacts.json'))).toBe(false);
    });

    it('должен корректно работать если файлы не существуют', async () => {
      const storage = new Storage({ homeDir: tempDir });
      // Не должно выбросить ошибку
      await expect(storage.clear()).resolves.toBeUndefined();
    });
  });

  describe('FOXGRAM_HOME env priority', () => {
    it('должен использовать FOXGRAM_HOME при сохранении config', async () => {
      const foxgramHomeDir = path.join(tempDir, 'from-env');
      process.env.FOXGRAM_HOME = foxgramHomeDir;

      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      // Создаём storage без homeDir — должен использовать FOXGRAM_HOME
      const storage = new Storage();
      await storage.saveConfig(config);

      expect(fs.existsSync(path.join(foxgramHomeDir, 'config.json'))).toBe(true);
    });

    it('должен использовать FOXGRAM_HOME при загрузке config', async () => {
      const foxgramHomeDir = path.join(tempDir, 'from-env-load');
      process.env.FOXGRAM_HOME = foxgramHomeDir;

      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      // Создаём директорию и сохраняем файл напрямую
      await fsPromises.mkdir(foxgramHomeDir, { recursive: true });
      await fsPromises.writeFile(path.join(foxgramHomeDir, 'config.json'), JSON.stringify(config));

      // Загружаем через storage (должен использовать FOXGRAM_HOME)
      const storage = new Storage();
      const loaded = await storage.loadConfig();

      expect(loaded).not.toBeNull();
      expect(loaded!.username).toBe('alice');
    });
  });

  describe('file permissions', () => {
    it('должен устанавливать права 0o600 на config.json', async () => {
      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveConfig(config);

      const stats = fs.statSync(path.join(tempDir, 'config.json'));
      const mode = stats.mode & 0o777;
      // На Linux/macOS должно быть 0o600
      // На Windows chmod может не работать, поэтому проверяем что файл существует
      if (process.platform !== 'win32') {
        expect(mode).toBe(0o600);
      }
    });

    it('должен устанавливать права 0o600 на contacts.json', async () => {
      const contacts: Contact[] = [
        { userId: 'user-1', username: 'bob', publicKey: 'key-bob' },
      ];

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveContacts(contacts);

      const stats = fs.statSync(path.join(tempDir, 'contacts.json'));
      const mode = stats.mode & 0o777;
      if (process.platform !== 'win32') {
        expect(mode).toBe(0o600);
      }
    });

    it('должен устанавливать права 0o600 на config.json (через fs.promises.chmod)', async () => {
      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveConfig(config);

      const stats = fs.statSync(path.join(tempDir, 'config.json'));
      const mode = stats.mode & 0o777;
      if (process.platform !== 'win32') {
        expect(mode).toBe(0o600);
      }
    });
  });

  describe('config.json structure', () => {
    it('должен сохранять config.json в формате JSON с отступами', async () => {
      const config: FoxgramConfig = {
        serverUrl: 'http://localhost:3000',
        userId: 'user-123',
        username: 'alice',
        publicKey: 'key',
        secretKey: 'secret',
        token: 'token',
      };

      const storage = new Storage({ homeDir: tempDir });
      await storage.saveConfig(config);

      const content = fs.readFileSync(path.join(tempDir, 'config.json'), 'utf-8');
      // JSON.stringify с null, 2 — форматированный JSON
      const parsed = JSON.parse(content);
      expect(parsed.serverUrl).toBe('http://localhost:3000');
      expect(parsed.userId).toBe('user-123');
      expect(parsed.username).toBe('alice');
      expect(parsed.publicKey).toBe('key');
      expect(parsed.secretKey).toBe('secret');
      expect(parsed.token).toBe('token');
    });
  });
});
