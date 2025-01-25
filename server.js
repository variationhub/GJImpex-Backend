const cluster = require("cluster");
const os = require("os");

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;

    console.log(`Master ${process.pid} is running`);
    console.log(`Forking server for ${numCPUs} CPUs...`);

    // Fork workers for each CPU
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Listen for dying workers and respawn if necessary
    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Spawning a new one...`);
        cluster.fork();
    });
} else {
    const express = require("express");
    const mongoose = require("mongoose");
    const cors = require("cors");
    require("dotenv").config();
    const morgan = require("morgan");
    const loginRoute = require("./routes/loginRoute");
    const userRoute = require("./routes/userRoute");
    const transportRoute = require("./routes/transportRoute");
    const productRoute = require("./routes/productRoute");
    const taskRoute = require("./routes/taskRoute");
    const conversationRoute = require("./routes/conversationRoute");
    const partyRoute = require("./routes/partyRoute.js");
    const orderRoute = require("./routes/orderRoute");
    const overviewRoute = require("./routes/overviewRoute");
    const notificationRoute = require("./routes/notificationRoute");
    const WebSocket = require("ws");
    const { handleConnection, sendMessage } = require("./websocketHandler");
    const admin = require("firebase-admin");
    const serviceAccount = require("./gj-impex.json");
    const cron = require("./services/cronJob.js");

    const PORT = process.env.PORT || 8000;
    const app = express();

    app.use(cors());
    app.use(morgan("tiny"));
    app.use(express.json());

    mongoose
        .connect(process.env.MONGODB_URL)
        .then(() => {
            console.log("DB connected");
        })
        .catch((err) => {
            console.error(err);
        });

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    cron.start();

    app.get("/", (req, res) => {
        res.send("Server is running");
    });

    app.use("/api/login", loginRoute);
    app.use("/api/users", userRoute);
    app.use("/api/transports", transportRoute);
    app.use("/api/products", productRoute);
    app.use("/api/tasks", taskRoute);
    app.use("/api/conversations", conversationRoute);
    app.use("/api/party", partyRoute);
    app.use("/api/orders", orderRoute);
    app.use("/api/overview", overviewRoute);
    app.use("/api/notification", notificationRoute);

    // WebSocket server
    const wss = new WebSocket.Server({ port: 8080 });

    wss.on("connection", handleConnection);

    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} is running on http://localhost:${PORT}`);
    });

    module.exports.sendMessage = sendMessage;
}
