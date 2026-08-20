import net from 'node:net';

const host = process.env.HOST?.trim() || '127.0.0.1';
const port = Number.parseInt(process.env.PORT?.trim() || '3000', 10);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`Invalid PORT value: ${process.env.PORT ?? ''}`);
  process.exit(1);
}

const socket = net.createConnection({ host, port });

const finish = (code: number): void => {
  socket.removeAllListeners();
  socket.destroy();
  process.exit(code);
};

socket.setTimeout(1000);

socket.on('connect', () => {
  console.error('');
  console.error(`TallySync backend start blocked: ${host}:${port} is already accepting connections.`);
  console.error('Stop the existing backend process before starting another instance on the same port.');
  console.error('Windows PowerShell:');
  console.error(`  netstat -ano | findstr :${port}`);
  console.error('  tasklist /FI "PID eq <PID>"');
  console.error('  taskkill /PID <PID> /F   # only if it is the old TallySync node process');
  console.error('');
  finish(1);
});

socket.on('timeout', () => finish(0));
socket.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH' || error.code === 'ENETUNREACH') {
    finish(0);
    return;
  }

  console.error(`Unable to verify ${host}:${port}: ${error.code ?? error.message}`);
  finish(1);
});
