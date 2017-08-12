var express = require('express');
var router = express.Router();
var bitcoin = require("bitcoin");
var client = new bitcoin.Client({
    host: 'localhost',
    port: 8332,
    user: 'user',
    pass: 'root'
});
