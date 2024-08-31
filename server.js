const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
require("dotenv").config();
const morgan = require('morgan');
const loginRoute = require("./routes/loginRoute")
const userRoute = require("./routes/userRoute")
const transportRoute = require("./routes/transportRoute")
const productRoute = require("./routes/productRoute")
const taskRoute = require("./routes/taskRoute")
const conversationRoute = require("./routes/conversationRoute")
const partyRoute = require("./routes/partyRoute.js")
const orderRoute = require("./routes/orderRoute");
const overviewRoute = require("./routes/overviewRoute");
const notificationRoute = require("./routes/notificationRoute");
const WebSocket = require('ws');
const { handleConnection, sendMessage } = require('./websocketHandler');
const admin = require("firebase-admin");
const serviceAccount = require("./gj-impex.json");

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', handleConnection);

const PORT = process.env.PORT || 8000;
const app = express();

app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URL).then((connection) => {
    console.log("DB connected");
}).catch((err) => {
    console.error(err)
})


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.get('/', (req, res) => {
    res.send("Server is running")
});
app.use('/api/login', loginRoute);
app.use('/api/users', userRoute);
app.use('/api/transports', transportRoute);
app.use('/api/products', productRoute);
app.use('/api/tasks', taskRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/party', partyRoute);
app.use('/api/orders', orderRoute);
app.use('/api/overview', overviewRoute);
app.use('/api/notification', notificationRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports.sendMessage = sendMessage;