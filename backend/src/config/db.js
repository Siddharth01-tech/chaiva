const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);
const mongoose =require('mongoose');
async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("connect to db")
}

module.exports=connectDB