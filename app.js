/*=====================Initialisation=====================*/
const express = require("express");
require('dotenv').config();
const app  = express();
const http = require('http').Server(app);
const httpd	= require('https');
const fs = require('fs');
const bodyParser = require('body-parser')
const ejs = require('ejs');
const path = require('path');
const session = require('express-session');
const esso = require('eve-sso-simple');
const url = 'mongodb://'+ process.env.DB_HOST +':'+ process.env.DB_PORT +'/' + process.env.DB_NAME;
const minify = require('express-minify');
var RedisStore = require('connect-redis')(session);



/*======================================================*/

const mongoose = require('mongoose');
mongoose.connect(url, { useNewUrlParser: true });
let db = mongoose.connection;
db.on('error', function(err){
	process.exit(1)
});
db.once('open', function() {
	console.log('Connected')
});

//define model
require('./models/model.js')(mongoose);

//logger
LOGS = require('./src/history.js');

// Middleware session
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));
app.use(minify({cache: __dirname + '/cache'}));

if (!process.env.DEV) {
	app.use(session({
		resave: false, 
		saveUninitialized: false,
		secret: process.env.COOKIE,
		store: new RedisStore
	}));
} else {
	app.use(session(
	{
		secret: process.env.COOKIE,
		saveUninitialized: false,
		resave: false
	}
	));
}




app.use(bodyParser.json());       // to support JSON-encoded bodies

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 

app.enable('trust proxy');

// middlewere de secu
app.use(function (req, res, next) {
	var _ = require('underscore')
	, nonSecurePaths = ['/callback/', '/logout', '/test'];

	if ( _.contains(nonSecurePaths, req.path) ) 
		return next();
	else if (!req.session.userinfo) {
		esso.login(
		{
			client_id: process.env.C_ID,
			client_secret: process.env.C_SECRET,
			redirect_uri:  process.env.CALLBACK
		}, res);
	} else if (req.session.db.role == 0){
		res.render('under')
		return null
	} else if (req.session.db.role <= 0){
		res.redirect('https://www.google.fr/search?biw=1920&tbm=isch&source=hp&biw=&bih=969&q=trash&oq=trash');
		return null
	} else {
		return next()
	}
});

/*======================routes==========================*/ 

/*------include fichier------*/
require('./src/remove.js')(app, path, ejs, fs);
require('./src/character.js')(app, path, ejs, fs);
require('./src/log.js')(app, path, ejs, fs, esso);
require('./src/members.js')(app, path, ejs, fs);

/*======================route fichier static (public)====================*/
app.use("/css", express.static(__dirname + '/public/css'));
app.use("/img", express.static(__dirname + '/public/img'));
app.use("/js", express.static(__dirname + '/public/js'));


/*==================start serv==================*/
http.listen(process.env.PORT, function(){
	console.log('listening on *:' + process.env.PORT);
});