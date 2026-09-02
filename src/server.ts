import { Server } from 'http';

import app from './app';
import config from './app/config/index';

let server: Server;

async function main() {
  try {
   
    server = app.listen(config.port, () => {
       console.log(`🚀 Server running on http://${config.host}:${config.port}`);
    });


    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ Port ${config.port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ Port ${config.port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (err) {
    console.error('❌ Failed to start the server:', err);
    process.exit(1);
  }
}

main();


process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection detected. Shutting down...', reason);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});


process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception detected. Shutting down...', error);
  process.exit(1);
});


process.on('SIGTERM', () => {
  console.log('🟡 SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('✅ Process terminated gracefully');
    });
  }
});

process.on('SIGINT', () => {
  console.log('🟡 SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('✅ Process terminated gracefully');
    });
  }
});