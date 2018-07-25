var express = require('express');
var router = express.Router();
var request = require('request');
var bitcoin = require("bitcoin");
var async = require('async');
var client = new bitcoin.Client({
    host: 'localhost',
    port: 8332,
    user: 'lol',
    pass: 'lol'
});

function getNewestBlock(req, res, next) {
    client.getBlockchainInfo(function(err, result) {
        res.locals.newestblock = result.blocks;
        next();
    });
}

function getBlockHash(req, res, next) {
    client.getBlockHash(res.locals.newestblock, function(err, hash) {
        res.locals.blockhash = hash;
        next();
    });
}

function getBlock(req, res, next) {
    client.getBlock(res.locals.blockhash, function(err, info) {
        res.locals.block = info;
        next();
    });
}

function getRawTransaction(req, res, next) {
    client.getRawTransaction(res.locals.txid, 1, function(err, info) {
        res.locals.rawtransaction = info;
        next();
    });
}

function getNBlocks(req, res, next) {
    var n = 5;
    var i = 0;
    res.locals.blocks = [];
    for (var k = 0; k < n; k++) {
        client.getBlockHash(res.locals.newestblock - k, function(err, hash) {
            res.locals.blockhash = hash;
            client.getBlock(res.locals.blockhash, function(err, info) {
                res.locals.blocks.push(info);
                i += 1
                if (i == n) {
                    next();
                }
            });
        });
    }
}

router.get('/blocks', function(req, res, next) {
    // Each call is a function
    calls = [];
    console.log(1);

    // Pushing initial function that gets the latest block info
    calls.push(
        function(callback) {
            client.getBestBlockHash(function(err, bestblockhash) {
                console.log(bestblockhash);
                client.getBlock(bestblockhash, function(err, block) {
                    blocks = [block];
                    callback(null, blocks);
                });
            });
        }
    );

    // Push 50 blocks in order
    for (var i = 0; i < 50; i++) {
        calls.push(function(blocks, callback) {
            client.getBlock(blocks[blocks.length-1].previousblockhash, function(err, block) {
                blocks.push(block)
                callback(null, blocks);
            });
        })
    }

    // Run and render calls
    async.waterfall(calls, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            res.render('blocks', {
                "blocks": result
            });
        }
    });
});

router.get('/block/:hash',
    function(req, res, next) {
        res.locals.blockhash = req.params.hash
        next();
    },
    getBlock,
    function(req, res, next) {
        var block = res.locals.block;

        res.render('block', {
            "height": block.height,
            "hash": block.hash,
            "size": block.size,
            "weight": block.weight,
            "time": block.time,
            "txsraw": block.tx,
            "txs": block.tx.length,
            "version": block.version,
            "versionhex": block.versionHex,
            "difficulty": block.difficulty,
            "nonce": block.nonce,
            "merkleroot": block.merkleroot,
            "previousblockhash": block.previousblockhash,
            "nextblockhash": block.nextblockhash
        });
    }
);

function getInputs(req, res, next) {
    res.locals.inputAddresses = [];
    var j = 0;
    for (var i = 0; i < res.locals.rawtransaction.vin.length; i++) {
        client.getRawTransaction(res.locals.rawtransaction.vin[i].txid, 1, function(err, info) {
            try {
                res.locals.inputAddresses.push(
                    info.vout[res.locals.rawtransaction.vin[j].vout]
                );
            } catch(err) {
                next();
            }
            j++;

            // Ensures that all address are pushed into array before moving on.
            if (res.locals.inputAddresses.length == res.locals.rawtransaction.vin.length) {
                next();
            }
        });
    }
}

function getBlockReward(req, res, next) {
    var blockRewards = {
        0: 50,
        210000: 25,
        420000: 12.5,
        630000: 6.25,
        840000: 3.125,
        1050000: 1.5625,
        1260000: 0.78125,
        1470000: 0.390625,
        1680000: 0.1953125,
        1890000: 0.09765625,
        2100000: 0.04882812,
        2310000: 0.02441406,
        2520000: 0.01220703,
        2730000: 0.00610351,
        2940000: 0.00305175,
        3150000: 0.00152587,
        3360000: 0.00076293,
        3570000: 0.00038146,
        3780000: 0.00019073,
        3990000: 0.00009536,
        4200000: 0.00004768,
        4410000: 0.00002384,
        4620000: 0.00001192,
        4830000: 0.00000596,
        5040000: 0.00000298,
        5250000: 0.00000149,
        5460000: 0.00000074,
        5670000: 0.00000037,
        5880000: 0.00000018,
        6090000: 0.00000009,
        6300000: 0.00000004,
        6510000: 0.00000002,
        6720000: 0.00000001,
        6930000: 0.00000000
    };
    client.getBlock(res.locals.rawtransaction.blockhash, function(err, info) {
        for (var block in blockRewards) {
            if (block < info.height) {
                res.locals.blockreward = blockRewards[block];
            }
        }
        next();
    });
}


router.get('/tx/:id', function(req, res, next) {
    calls = [];
    // Get the raw transaction
    client.getRawTransaction(req.params.id, 1, function(err, rawtransaction) {
        // Loop through all inputs and get raw transaction of those
        rawtransaction.vin.forEach(function(input) {
            calls.push(function(callback) {
                client.getRawTransaction(input.txid, 1, function(err, rawtransaction2) {
                    try {
                        callback(null, rawtransaction2.vout[input.vout]);
                    } catch(e) {
                        callback(true)
                    }
                });

            });
        });

        // calls = array of inputs and gets raw tx of them
        async.series(calls, function(err, result) {
            fees = 0;
            if (err == true) {
                result = []
            } else {
                rawtransaction.vout.forEach(function(_vout) {
                    fees -= _vout.value;
                });
                result.forEach(function(_vin) {
                    fees += _vin.value;
                });
            }
            console.log(result.length)

            res.render('tx', {
                "txid": req.params.id,
                "confirmations": rawtransaction.confirmations,
                "blockhash": rawtransaction.blockhash,
                "time": rawtransaction.time,
                "vout": rawtransaction.vout,
                "vin": result,
                "fee": fees.toFixed(8),
                "blockreward": 12.5
            });
        });
    });
});

router.get('/header', function(req, res, next) {
    res.render("header", {
    });
});

router.get('/address/:address', function(req, res, next) {
    client.validateAddress(req.params.address, function(err, result) {
        console.log(JSON.stringify(result));
        res.render("address", {
            "address": result.address,
            "isValid": result.isvalid,
            "scriptPubKey": result.scriptPubKey
        });
    });
});

module.exports = router;
