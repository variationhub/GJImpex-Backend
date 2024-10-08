let clients = [];
const WebSocket = require('ws');

function handleConnection(ws) {
    clients.push(ws);
    console.log('Client connected');

    ws.on('close', function () {
        clients = clients.filter(client => client !== ws);
        console.log('Client disconnected');
    });
}

function sendMessage(message = {}) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

setInterval(() => {
    sendMessage()
}, 25000)

module.exports.handleConnection = handleConnection;
module.exports.sendMessage = sendMessage;
