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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});