const app = require('./src/app')
require('dotenv').config();
const connectDB = require('./src/config/db');

connectDB();

app.listen(3000,()=>{
    console.log("server is running on 3000")
})