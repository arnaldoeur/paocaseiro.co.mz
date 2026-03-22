const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting Vite server...');
const vite = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev', '--', '--port', '5173'], { stdio: 'ignore' });

console.log('Starting LocalTunnel...');
const lt = spawn('cmd.exe', ['/c', 'npx', '--yes', 'localtunnel', '--port', '5173']);

lt.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    if (output.includes('your url is:')) {
        const url = output.split('your url is:')[1].trim();
        fs.writeFileSync('preview_url.txt', url);
        console.log('URL saved to preview_url.txt');
        process.exit(0);
    }
});

lt.stderr.on('data', (data) => {
    console.error(`lt stderr: ${data}`);
});

setTimeout(() => {
    console.log('Timeout waiting for LT URL');
    process.exit(1);
}, 15000);
