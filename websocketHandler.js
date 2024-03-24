let clients = [];
const WebSocket = require('ws');

function handleConnection(ws) {
    clients.push(ws);
    console.log('Client connected');

    ws.on('message', function incoming(message) {
        // Handle incoming messages
    });

    ws.on('close', function () {
        clients = clients.filter(client => client !== ws);
        console.log('Client disconnected');
    });
}

function sendMessage(message) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports.handleConnection = handleConnection;
module.exports.sendMessage = sendMessage;
