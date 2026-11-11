const app = require('./src/app')
require('dotenv').config();
const connectdb = require('./src/config/db');

connectdb();

app.listen(3000,()=>{
    console.log("server is running on 3000")
})