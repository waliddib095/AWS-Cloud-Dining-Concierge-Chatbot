exports.handler = async (event) => {
    const yelp = require('yelp-fusion');
    const client = yelp.client("Your Yelp API Key");
    var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
    var phoneNumberFormat = require('google-libphonenumber').PhoneNumberFormat;
    var message = "";
    var actualMessage = "";
    var restaurantSuggestion = "";
    var sqsQueueUrl = "Your SQS queue URL";
    var AWS = require('aws-sdk');
    AWS.config.update({region: 'us-east-1'});
    var sqs = new AWS.SQS();
    var ddb = new AWS.DynamoDB();
    var sns = new AWS.SNS();
    var receiveMessageParams = {
        QueueUrl: sqsQueueUrl,
        MaxNumberOfMessages: 1
    };
    return sqs.receiveMessage(receiveMessageParams).promise()
    .then((data) => {
        if(!data.hasOwnProperty('Messages')){
            throw new Error('No message in the SQS queue');
        }
        message = JSON.parse(data.Messages[0].Body).currentIntent.slots;
        actualMessage = JSON.parse(data.Messages[0].Body).currentIntent.slotDetails;
        var deleteMessageParams = {
            QueueUrl: sqsQueueUrl,
            ReceiptHandle: data.Messages[0].ReceiptHandle
        };
        return sqs.deleteMessage(deleteMessageParams).promise();
    })
    .then((data) =>{
        return client.search({
            term: "restaurants",
            limit: 5,
            location: message.Location,
            categories: message.Cuisine,
            open_at: new Date(message.Date+" "+message.Time).getTime()/1000
        });
    })
    .then((data) =>{
        restaurantSuggestion = "Hello! Here are my "+actualMessage.Cuisine.originalValue+" restaurant suggestions for "+actualMessage.Number_Of_People.originalValue+" people, for "+actualMessage.Date.originalValue+" at"+actualMessage.Time.originalValue+":\n";
        var restaurantSuggestionCount = 1;
        JSON.parse(data.body).businesses.forEach(e => {
            restaurantSuggestion+= restaurantSuggestionCount+". "+ e.name+", located at "+e.location.address1+"\n";
            restaurantSuggestionCount++;
        });
        restaurantSuggestion+= "Enjoy your meal!";
        var dynamoDbParams = {
            TableName: 'Your Dynamo DB Table Name',
            Item: {
                'MESSAGE' : {S: JSON.stringify(message)},
                'RESTAURANT_SUGGESTIONS' : {S: JSON.stringify(JSON.parse(data.body).businesses)}
            }
        };
        return ddb.putItem(dynamoDbParams).promise();
    })
    .then((data) =>{
        var parsedPhoneNumber = phoneUtil.parseAndKeepRawInput(message.Phone_Number,'US');
        var phoneNumberE164 = phoneUtil.format(parsedPhoneNumber, phoneNumberFormat.E164);
        var smsParams = {
            Message: restaurantSuggestion,
            PhoneNumber: phoneNumberE164
        };
        return sns.publish(smsParams).promise();
    })
    .then((data) =>{
        console.log("MessageID is " + data.MessageId);
    })
    .catch((err) => {
        console.log(err);
    })
};
