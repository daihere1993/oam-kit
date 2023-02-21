// W/A: to fix crypto.createDiffieHellman() crash issue when using SSH2
// Link: https://github.com/liximomo/vscode-sftp/issues/883#issuecomment-778684682
export const sftp_algorithms = {
  kex: ['ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group14-sha1'],
  cipher: [
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-gcm',
    'aes128-gcm@openssh.com',
    'aes256-gcm',
    'aes256-gcm@openssh.com',
  ],
  serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'],
  hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
};
