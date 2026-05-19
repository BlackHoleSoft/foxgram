import { FoxgramConfig } from './types';

/**
 * Foxgram client — main entry point for the SDK.
 * Handles registration, login, messaging, contacts, and storage.
 */
export class Foxgram {
  private config: FoxgramConfig;

  constructor(config: FoxgramConfig) {
    this.config = config;
  }
}
