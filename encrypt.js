const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Encrypts a string using RSA-OAEP encryption with a public key
 * Handles messages of any length by chunking
 * @param {string} text - The text to encrypt
 * @param {string} publicKey - The public key in PEM format
 * @returns {string} - Base64 encoded encrypted data (format: chunkCount:encryptedChunk1:encryptedChunk2:...)
 */
function encrypt(text, publicKey) {
    // Validate inputs
    if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
    }
    if (!publicKey || typeof publicKey !== 'string') {
        throw new Error('Public key must be a non-empty string');
    }

    // RSA-OAEP can encrypt up to (keySize/8 - 2*hashSize/8 - 2) bytes per chunk
    // For 2048-bit key with SHA-256: 256 - 32 - 2 = 222 bytes per chunk
    const MAX_CHUNK_SIZE = 190; // Conservative size for 2048-bit RSA with OAEP padding
    const textBuffer = Buffer.from(text, 'utf8');
    const chunks = [];
    
    // Split text into chunks
    for (let i = 0; i < textBuffer.length; i += MAX_CHUNK_SIZE) {
        chunks.push(textBuffer.slice(i, i + MAX_CHUNK_SIZE));
    }

    // Encrypt each chunk
    const encryptedChunks = chunks.map(chunk => {
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            chunk
        );
        return encrypted.toString('base64');
    });

    // Combine chunk count and encrypted chunks
    const result = `${encryptedChunks.length}:${encryptedChunks.join(':')}`;
    return result;
}

// Helper function to read public key from file
function getPublicKeyFromFile() {
    const keyPath = path.join(__dirname, 'public-key.txt');
    try {
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath, 'utf8').trim();
        }
    } catch (error) {
        // File doesn't exist or can't be read
    }
    return null;
}

// Example usage
if (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Try to load key from file first
    const fileKey = getPublicKeyFromFile();
    const keyPrompt = fileKey 
        ? `Enter your public key (press Enter to use key from public-key.txt): `
        : 'Enter your public key: ';

    rl.question('Enter text to encrypt: ', (text) => {
        rl.question(keyPrompt, (key) => {
            // Use key from file if user pressed Enter, otherwise use provided key
            const finalKey = (key.trim() === '' && fileKey) ? fileKey : key;
            
            if (!finalKey) {
                console.error('Error: Public key is required');
                rl.close();
                return;
            }

            try {
                const encrypted = encrypt(text, finalKey);
                console.log('\nEncrypted text:');
                console.log(encrypted);
                console.log('\nSave this encrypted text to decrypt it later.');
                console.log('Note: Only the holder of the private key can decrypt this.');
            } catch (error) {
                console.error('Error:', error.message);
            }
            rl.close();
        });
    });
}

module.exports = { encrypt };
