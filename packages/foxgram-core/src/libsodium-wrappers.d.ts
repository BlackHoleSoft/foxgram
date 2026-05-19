declare module 'libsodium-wrappers' {
  interface Sodium {
    isReady: boolean;
    ready: Promise<void>;
    randombytes_buf(length: number): Uint8Array;
    crypto_box_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
    crypto_scalarmult_base(secretKey: Uint8Array): Uint8Array;
    crypto_scalarmult(scalar: Uint8Array, point: Uint8Array): Uint8Array;
    crypto_box_beforenm(
      secretKey: Uint8Array,
      publicKey: Uint8Array
    ): Uint8Array;
    crypto_secretbox_easy(
      message: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array
    ): Uint8Array;
    crypto_secretbox_open_easy(
      message: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array
    ): Uint8Array | false;
    base64_variants: {
      ORIGINAL: number;
      URLSAFE: number;
      URLSAFE_NO_PAD: number;
    };
  }

  const sodium: Sodium;
  export = sodium;
}
