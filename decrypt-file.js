const { decrypt } = require('./decrypt');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('Usage: node decrypt-file.js <input.txt> [output.json] [private-key.txt]');
    console.error('  input.txt: Path to encrypted text file');
    console.error('  output.json: Path to output JSON file (default: <input>-decrypted.json)');
    console.error('  private-key.txt: Path to private key file (default: private-key.txt)');
    process.exit(1);
}

const inputFilePath = path.resolve(args[0]);
const outputFilePath = args[1] ? path.resolve(args[1]) : inputFilePath.replace(/\.txt$/, '-decrypted.json');
const privateKeyPath = args[2] ? path.resolve(args[2]) : path.join(__dirname, 'private-key.txt');

try {
    // Check if input file exists
    if (!fs.existsSync(inputFilePath)) {
        throw new Error(`Input file not found: ${inputFilePath}`);
    }
    
    // Read encrypted content
    const encryptedContent = fs.readFileSync(inputFilePath, 'utf8').trim();
    
    if (!encryptedContent) {
        throw new Error('Input file is empty');
    }
    
    // Read private key
    if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`Private key file not found: ${privateKeyPath}`);
    }
    
    let privateKey = fs.readFileSync(privateKeyPath, 'utf8').trim();
    
    // Ensure private key has proper PEM headers if missing
    if (!privateKey.includes('BEGIN')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
    
    // Decrypt
    console.log(`Decrypting ${path.basename(inputFilePath)}...`);
    console.log(`Encrypted content length: ${encryptedContent.length} characters`);
    
    const decrypted = decrypt(encryptedContent, privateKey);
    
    // Try to parse as JSON, if it fails, wrap it in a JSON object
    let jsonOutput;
    try {
        jsonOutput = JSON.parse(decrypted);
    } catch (parseError) {
        // If it's not valid JSON, wrap it in an object
        jsonOutput = {
            decrypted_content: decrypted,
            original_length: decrypted.length,
            decrypted_at: new Date().toISOString()
        };
    }
    
    // Write decrypted content as JSON
    fs.writeFileSync(outputFilePath, JSON.stringify(jsonOutput, null, 2), 'utf8');
    
    console.log(`\nDecryption successful!`);
    console.log(`Decrypted content saved to: ${outputFilePath}`);
    console.log(`Decrypted content length: ${decrypted.length} characters`);
    console.log(`Output format: ${typeof jsonOutput === 'object' && !jsonOutput.decrypted_content ? 'JSON object' : 'Wrapped in JSON object'}`);
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
