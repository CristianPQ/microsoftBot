var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');


//Yandex API vars
var yandexURI = "https://translate.yandex.net/api/v1.5/";
var yandexTranslate = "tr.json/translate";
var yandexSupported = "tr.json/getLangs";
var yandexKey = "trnsl.1.1.20170208T163336Z.17ad37a93f70dd69.11ba34fd99ac6320ae57776daf0c68f958b63f97";

//=========================================================
// Aux function
//=========================================================



//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
	function(session, args, next) {
		if(!session.privateConversationData.firstTime) {
			session.send("Welcome to botTranslator!")
			session.privateConversationData.firstTime = true;
		}
		if (!session.userData.langs) {
			session.beginDialog("/supported");
		}
		else if (!session.privateConversationData.language) {
			session.beginDialog("/language");
		}
		else {
			next();
		}
		//TODO: Comprobar si la API acepta nuevos idiomas y en caso afirmativo informar al usuario
	},
	function(session, next) {
		session.beginDialog("/translate");

	}
	]);

bot.dialog('/supported', 
	function(session) {
		request.post({url:yandexURI+yandexSupported, form:{key:yandexKey, ui:"en"}}, function(err, resp, body){
			session.userData.dirs = JSON.parse(body).dirs;
			session.userData.langs = JSON.parse(body).langs;
			session.userData.langsCode = Object.keys(session.userData.langs);
			session.userData.languages = [];

			for(var i = 0; i < session.userData.langsCode.length; i++) {
				session.userData.languages.push(session.userData.langs[session.userData.langsCode[i]]);
			}

			session.beginDialog("/language");
		});
		session.endDialog()
	});

bot.dialog('/language', [
	function(session) {
		builder.Prompts.choice(session, "To which language do you want to be translated?", session.userData.languages);
	},
	function(session, results) {
		session.privateConversationData.language = session.userData.langsCode[results.response.index];
		session.send("All your messages are going to be translated to " +
			session.userData.langs[session.privateConversationData.language])

		var validLangs = [];
		for (var i = 0; i < session.userData.dirs.length; i++) {
			var elem = session.userData.dirs[i].split("-");
			console.log(elem);
			if (elem[elem.length-1] == session.privateConversationData.language) {
				validLangs.push(elem[0]);
			}
		}

		var validLanguages = "";
		for (var i = 0; i < validLangs.length; i++) {
			validLanguages += "\n" + session.userData.langs[validLangs[i]];
		}
		if (validLangs.length < 1) {
			session.send("There is no valid language to translate from, I recommend you to change the target lenguage");
			

		} else{
			session.send("You can translate from: " + validLanguages);
		}
		session.endDialog();
	}
]);

bot.dialog('/translate', [
	function(session) {
		builder.Prompts.text(session, "What text do you want to translate to " +
			session.userData.langs[session.privateConversationData.language]);
	},
	function(session, results) {

		request.post({url:yandexURI+yandexTranslate, form:{key:yandexKey, text: results.response,
			lang: session.privateConversationData.language, format: "plain", options: "1"}}, function(err, resp, body){
			console.log(JSON.parse(body));
			session.send(results.response + " -- in %s is translated to %s as -- " + JSON.parse(body).text,
				session.userData.langs[JSON.parse(body).detected.lang], 
				session.userData.langs[session.privateConversationData.language]);
			session.endDialog();
		});
	}
	]);