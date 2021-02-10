exports.handler = async (event) => {

    console.log('Loading function');
    var AWS = require('aws-sdk');
    AWS.config.update({region: 'us-east-1'});
    var lexruntime = new AWS.LexRuntime();

    var lexChatbotParams = {
        botAlias: 'Your Lex Bot Alias',
        botName: 'Your Lex Bot Name',
        inputText: event.message,
        userId: event.identityID,
        requestAttributes: {},
        sessionAttributes: {}
    };

    return lexruntime.postText(lexChatbotParams).promise()
    .then((data) =>{
        const response = {
            headers: {
                "Access-Control-Allow-Origin" : "*"
            },
            statusCode: 200,
            body: data.message
        };
        return response;
    })
    .catch((err) =>{
        console.log(err);
    })
};
