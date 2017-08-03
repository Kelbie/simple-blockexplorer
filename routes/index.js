var express = require('express');
var router = express.Router();
var coins = require('../data/coins.json');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {
        coins: coins
    });
});

module.exports = router;
