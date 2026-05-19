declare module 'libsodium-wrappers' {
  interface Sodium {
    isReady: boolean;
    ready: Promise<void>;
    randombytes_buf(length: number): Uint8Array;
    crypto_box_keypair(): { publicKey: string; privateKey: string };
    crypto_box_publickey_from_secretkey(secretKey: string | Uint8Array): string;
    fromBase64(str: string, variant: number): Uint8Array;
    toBase64(data: Uint8Array, variant: number): string;
    fromUtf8(str: string): Uint8Array;
    toUtf8(data: Uint8Array): string;
    crypto_kx_client_session_keys(
      secretKey: string | Uint8Array,
      publicKey: string | Uint8Array
    ): { box: string; msg: string };
    crypto_secretbox_xchacha20poly1305(
      message: string | Uint8Array,
      nonce: string,
      key: string
    ): Uint8Array;
    crypto_secretbox_xchacha20poly1305_open(
      message: string | Uint8Array,
      nonce: string,
      key: string
    ): Uint8Array | false;
    base64_variants: {
      ORIGINAL: number;
      URLSAFE: number;
    };
  }

  const sodium: Sodium;
  export = sodium;
}
