const functions = require('firebase-functions');
const admin = require('firebase-admin');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const vision = require('@google-cloud/vision');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: 'sse-monitor.appspot.com',
});

const reply = async (req, res) => {
    const { body } = req;

    const smsResponse = new MessagingResponse();
    const smsMsg = smsResponse.message()

    const commands = body.Body.toLowerCase().split(/ (.+)/);
    const action = commands[0];
    const filter = commands[1];

    if (action === 'haz' && filter) {
        const client = new vision.ImageAnnotatorClient();

        const promises = [];
        for (let i = 0; i < body.NumMedia; i++) {
            promises.push(client.labelDetection(body[`MediaUrl${i}`]));
        }

        await Promise.all(promises).then((results) => {
            let numMatches = 0;
            results.map((result, i) => {
                result[0].labelAnnotations.some((label) => {
                    if (label.description.toLowerCase().includes(filter)) {
                        smsMsg.media(body[`MediaUrl${i}`]);
                        numMatches++;

                        return true;
                    }

                    return false;
                });
            });

            if (numMatches) {
                smsMsg.body(`i can haz ${filter}!`);
            } else {
                smsMsg.body(`not ${filter} 🙁`);
            }

            return null;
        });
    } else {
        smsMsg.body("wut?");
    }

    res.status(200).type('text/xml').end(smsResponse.toString());
};

exports.sms = functions.https.onRequest(reply);
