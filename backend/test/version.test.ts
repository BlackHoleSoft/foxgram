import request from 'supertest';
import app from '../src/index';
import { cleanup, setup } from './setup';

describe('GET /api/version', () => {
  beforeEach(() => {
    setup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Успешное получение версии', () => {
    it('должен возвращать 200 статус', async () => {
      const response = await request(app)
        .get('/api/version');

      expect(response.status).toBe(200);
    });

    it('должен содержать version в ответе', async () => {
      const response = await request(app)
        .get('/api/version');

      expect(response.body).toHaveProperty('version');
    });

    it('version должен быть в формате X.Y.Z', async () => {
      const response = await request(app)
        .get('/api/version');

      const versionRegex = /^\d+\.\d+\.\d+$/;
      expect(versionRegex.test(response.body.version)).toBe(true);
    });

    it('version должен соответствовать package.json', async () => {
      // Сначала получаем версию из API
      const response = await request(app)
        .get('/api/version');

      const apiVersion = response.body.version;

      // Затем читаем package.json напрямую
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(__dirname, '../src/../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      const packageVersion = packageJson.version;

      expect(apiVersion).toBe(packageVersion);
    });

    it('должен работать при множественных запросах', async () => {
      const promises = [
        request(app).get('/api/version'),
        request(app).get('/api/version'),
        request(app).get('/api/version')
      ];

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('version');
      });

      // Все версии должны быть одинаковыми
      const versions = responses.map(response => response.body.version);
      expect(versions[0]).toBe(versions[1]);
      expect(versions[1]).toBe(versions[2]);
    });
  });

  describe('Тесты безопасности', () => {
    it('должен блокировать инъекции в query параметрах', async () => {
      const response = await request(app)
        .get('/api/version?version=0.1.0\'; DROP TABLE user; --');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      
      // Версия не должна содержать SQL инъекцию
      const versionRegex = /^\d+\.\d+\.\d+$/;
      expect(versionRegex.test(response.body.version)).toBe(true);
    });

    it('должен экранировать XSS в query параметрах', async () => {
      const response = await request(app)
        .get('/api/version?version=0.1.0<script>alert("xss")</script>');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      
      // Версия не должна содержать теги
      expect(response.body.version).not.toContain('<script>');
      expect(response.body.version).not.toContain('</script>');
    });
  });
});