require('dotenv').config();
const express=require('express')
const connectdb=require('./config/db')
const app=express()
connectdb()
module.exports=app;