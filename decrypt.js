const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Decrypts an encrypted string using RSA-OAEP decryption with a private key
 * Handles messages of any length by decrypting chunks
 * @param {string} encryptedData - Base64 encoded encrypted data (format: chunkCount:encryptedChunk1:encryptedChunk2:...)
 * @param {string} privateKey - The private key in PEM format
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedData, privateKey) {
    // Validate inputs
    if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Encrypted data must be a non-empty string');
    }
    if (!privateKey || typeof privateKey !== 'string') {
        throw new Error('Private key must be a non-empty string');
    }

    // Split the encrypted data into components
    const parts = encryptedData.split(':');
    if (parts.length < 2) {
        throw new Error('Invalid encrypted data format. Expected format: chunkCount:encryptedChunk1:encryptedChunk2:...');
    }

    const chunkCount = parseInt(parts[0], 10);
    if (isNaN(chunkCount) || chunkCount < 1 || chunkCount !== parts.length - 1) {
        throw new Error('Invalid chunk count in encrypted data');
    }

    const encryptedChunks = parts.slice(1);

    // Decrypt each chunk
    const decryptedChunks = encryptedChunks.map((encryptedChunk, index) => {
        try {
            const encryptedBuffer = Buffer.from(encryptedChunk, 'base64');
            const decrypted = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                encryptedBuffer
            );
            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed for chunk ${index + 1}. The private key may be incorrect or the data may be corrupted.`);
        }
    });

    // Combine decrypted chunks
    const decryptedBuffer = Buffer.concat(decryptedChunks);
    return decryptedBuffer.toString('utf8');
}

// Helper function to read private key from file
function getPrivateKeyFromFile() {
    const keyPath = path.join(__dirname, 'private-key.txt');
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
    const fileKey = getPrivateKeyFromFile();
    const keyPrompt = fileKey 
        ? `Enter your private key (press Enter to use key from private-key.txt): `
        : 'Enter your private key: ';

    rl.question('Enter encrypted text: ', (encryptedText) => {
        rl.question(keyPrompt, (key) => {
            // Use key from file if user pressed Enter, otherwise use provided key
            const finalKey = (key.trim() === '' && fileKey) ? fileKey : key;
            
            if (!finalKey) {
                console.error('Error: Private key is required');
                rl.close();
                return;
            }

            try {
                const decrypted = decrypt(encryptedText, finalKey);
                console.log('\nDecrypted text:');
                console.log(decrypted);
            } catch (error) {
                console.error('Error:', error.message);
            }
            rl.close();
        });
    });
}

module.exports = { decrypt };
