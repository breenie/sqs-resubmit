var config  = require('./config.json');
var aws = require('aws-sdk');
var readlineSync = require('readline-sync');

var sqs = new aws.SQS({
    accessKeyId: config.aws.key,
    secretAccessKey: config.aws.secret,
    region: config.aws.region,
});

var handleMessages = function(source, target) {
    sqs.receiveMessage({QueueUrl: source, MaxNumberOfMessages: 10}, function (err, data) {
        if (err) {
            return console.error(err, err.stack);
        }

        var deleted = 0;
        var messages = data.Messages;

        messages.forEach(function(message) {
            if (err) {
                return console.error(err, err.stack);
            }

            var params = {
                MessageBody: message.Body,
                QueueUrl: target
            };

            console.log('Copying message "' + message.ReceiptHandle + '" to queue ' + target);

            sqs.sendMessage(params, function(err, data) {
                if (err) {
                    return console.error(err, err.stack);
                }

                sqs.deleteMessage({QueueUrl: source, MessageId: message.ReceiptHandle}, function(err, data) {
                    if (err) {
                        return console.error(err, err.stack);
                    }

                    console.log('Removed "' + message.ReceiptHandle + '" from ' + source);

                    deleted++;
                });
            });

            if (deleted === messages.length) {
                handleMessages(source, target);
            }
        });
    });
};

sqs.listQueues({}, function(err, data) {
    if (err) {
        return console.error(err, err.stack);
    }

    var queues = data.QueueUrls;
    var source = readlineSync.keyInSelect(queues, 'Which queue do you want to copy from?')
    var target = readlineSync.keyInSelect(queues, 'Which queue do you want to copy to?')

    // Selecting 0 actually produces -1, awesome!
    if (-1 === source || -1 === target) {
        return console.error('Cancelled by user.');
    }

    if (source === target) {
        return console.error('Source and destination are the same.');
    }

    console.log('Source:      ' + queues[source]);
    console.log('Destination: ' + queues[target]);
    console.log('Messages will be copied from ' + queues[source] + ' to ' + queues[target]);

    handleMessages(queues[source], queues[target]);
});
