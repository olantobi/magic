
/*
 * Copyright(c) Thomas Hansen thomas@servergardens.com, all right reserved
 */

/**
 * Key pair model for cryptography key pairs.
 */
export class KeyPair {

  /**
   * Fingerprint of public key in SHA256 format, with separators between each 256 bit.
   */
  fingerprint: string;

  /**
   * Public key, typically in base64 encoded DER format.
   */
  public_key: string;

  /**
   * Private key, typically in base64 encoded DER format.
   */
  private_key?: string;
}
  