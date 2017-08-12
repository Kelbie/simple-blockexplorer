var express = require('express');
var router = express.Router();
var all_coins = require('../data/coins.json');
var price = require('../data/price.json');
var fs = require('fs');
var request = require('request');
var latestblock = require('../data/latestblocks.json');
var async = require("async");
var bitcoin = require("bitcoin");
var client = new bitcoin.Client({
    host: 'localhost',
    port: 8332,
    user: 'user',
    pass: 'root'
});

/* GET home page. */
router.get('/s/:id', function(req, res, next) {
    var id = req.params.id;
    res.render('index', {
        coins: all_coins.coins,
        id: id,
        price: price
    });
});

router.get('/s/:id/price', function(req, res, next) {
    var id = req.params.id;
    res.render('price', {
        price: price
    });
});

router.get('/s/:id/blocks', function(req, res, next) {
    // Data for rendering
    var data = {
        blockchain: {}
    }
    client.getBlockchainInfo(function(err, result) {
        data.blockchain = result;
        res.render('blocks', data);
    });
});

router.get('/s/:id/mempool', function(req, res, next) {
    // Data for rendering
    var data = {
        mempool: {}
    }

    // Get data from bitcoin-qt
    client.getRawMemPool(function(err, result) {
        // Add data to be rendered to ejs
        data.mempool.rawTransactions = result;
        data.mempool.noOfTransactions = result.length;
        res.render('mempool', data);
    });
});
module.exports = router;
