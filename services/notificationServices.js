const admin = require('firebase-admin');

// Function to schedule a notification
const scheduleNotification = (token = "", title="", body="", sendTime) => {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: token,
    };

    const currentDateTime = new Date();
    const targetTime = new Date(sendTime);

    const delay = targetTime.getTime() - currentDateTime.getTime();

    setTimeout(() => {
        admin.messaging().send(message)
            .then(response => {
                console.log('Successfully sent scheduled message:', response);
            })
            .catch(error => {
                console.log('Error sending scheduled message:', error);
            });
    }, delay)
};

module.exports = scheduleNotification