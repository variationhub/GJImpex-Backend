const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
require("dotenv").config();

const loginRoute = require("./routes/loginRoute")
const userRoute = require("./routes/userRoute")
const productRoute = require("./routes/productRoute")
const orderRoute = require("./routes/orderRoute")

const PORT = process.env.PORT || 8000;
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URL_LOCAL).then((connection) => {
    console.log("DB connected");
}).catch((err) => {
    console.error(err)
})


app.use('/api/login', loginRoute);
app.use('/api/users', userRoute);
app.use('/api/products', productRoute);
app.use('/api/orders', orderRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});