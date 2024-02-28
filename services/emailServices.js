// const mailgun = require("mailgun-js");
// const DOMAIN = "sandbox4602d0d9859f4c7687452ce089384589.mailgun.org";
// const mg = mailgun({apiKey: "eedc8424462ada9d4efae67dcd1b51d8-408f32f3-a5dfa952", domain: DOMAIN});
// const data = {
// 	from: "Mailgun Sandbox <postmaster@sandbox4602d0d9859f4c7687452ce089384589.mailgun.org>",
// 	to: "dhruvsuhagiya11@gmail.com",
// 	subject: "Hello",
// 	text: "Testing some Mailgun awesomness!"
// };
// mg.messages().send(data, function (error, body) {
// 	console.log(body);
// });


const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: "eedc8424462ada9d4efae67dcd1b51d8-408f32f3-a5dfa952"});

mg.messages.create('sandbox-123.mailgun.org', {
	from: "Excited User <mailgun@sandbox-123.mailgun.org>",
	to: ["test@example.com"],
	subject: "Hello",
	text: "Testing some Mailgun awesomeness!",
	html: "<h1>Testing some Mailgun awesomeness!</h1>"
})
.then(msg => console.log(msg)) // logs response data
.catch(err => console.log(err)); // logs any error