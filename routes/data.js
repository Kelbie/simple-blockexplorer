var express = require('express');
var fs = require('fs');
var router = express.Router();
var request = require('request');
var bitcoin = require("bitcoin");
var async = require('async');
var client = new bitcoin.Client({
    host: 'localhost',
    port: 8332,
    user: 'user',
    pass: 'root'
});

router.get('/data', function(req, res, next) {
    txs = [];
    data = [];
    calls = [
        function(callback) {
            client.getBestBlockHash(function(err, blockhash) {
                client.getBlock(blockhash, function(err, block) {
                    txs.push(block.tx.length);
                    data.push({
                        "category": block.height,
                        "column-1": block.tx.length
                    });
                    callback(null, block)
                })
            })
        }
    ];
    for (var i = 0; i < 144; i++) {
        calls.push(function(last, callback) {
            client.getBlock(last.previousblockhash, function(err, block) {
                data.push({
                    "category": block.height,
                    "column-1": block.tx.length
                });
                callback(null, block);
            });
        });
    }
    async.waterfall(calls, function(err, result) {
        res.render("data", {
            "txs": txs,
            "data": data
        });
        console.log(data);
    });
});

router.get('/data2', function(req, res, next) {
    console.log("start")
    // Get n previous blocks
    sum = 0;
    calls = [];
    var start_height = 1+400000;  // Block 0 tx is not in utxo.
    var blocks = 20;
    console.log(start_height, start_height+blocks)
    for (var i = start_height; i < start_height+blocks; i++) {
        calls.push(function(...arguments) {
            // Last block is start_height or previous iteration of waterfall.
            if (arguments.length == 2) {
                var last = arguments[0];
                var callback = arguments[1]
            } else {
                var last = start_height;
                var callback = arguments[0];
            }
            client.getBlockHash(last, function(err, blockhash) {
                if (!err) {
                    last = blockhash;
                }
                client.getBlock(last, function(err, block) {
                    client.getRawTransaction(block.tx[0], 1, function(err, rawtx) {
                            var total = 0;
                            for (i in rawtx.vout) {
                                total += parseFloat(rawtx.vout[i].value.toFixed(8));
                            }
                            console.log(block.tx[0], parseFloat(total.toFixed(8)));
                            sum += parseFloat(total.toFixed(8));
                            callback(null, block.nextblockhash);
                    });
                });
            });
        });
    }
    // run each function in calls
    async.waterfall(calls, function(err, result) {
        fs.appendFile('helloworld.txt', sum + "\n", function (err) {});
        res.render("data2", {
            "result": result,
        });
    });
});


module.exports = router;
