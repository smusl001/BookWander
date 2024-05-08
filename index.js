// Importing modules that we need.
var express = require ('express')
var ejs = require('ejs')
var bodyParser= require ('body-parser')
var session = require ('express-session');
const mysql = require('mysql');
const expressSanitizer = require('express-sanitizer');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // This code limit each IP to 1000 requests per windowMs
});

// These are creating the express application object.
const app = express()
const port = 8000

app.use(bodyParser.urlencoded({ extended: true }))
app.use(limiter);

// This is setting up the CSS.
app.use(express.static(__dirname + '/public'));

// This is creating a session.
app.use(session({
    secret: 'somerandomstuff',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

app.use(expressSanitizer());

// This is defining the database connection.
const db = mysql.createConnection ({
    host: 'localhost',
    user: 'appuser',
    password: 'app2027',
    database: 'myBookshop'
});

// Helping connect to the database.
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});
global.db = db;

// Content Security Policy (CSP).
const helmet = require('helmet');


app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
    },
}));

app.set('trust proxy', 1);

// This is where Express pick up HTML files.
app.set('views', __dirname + '/views');

// This is where we tell Express that we want to use EJS as the templating engine.
app.set('view engine', 'ejs');

// This is where we tell Express how we should process html files.
app.engine('html', ejs.renderFile);

// This is where we define our data.
var shopData = {shopName: "BookWander Book Shop"}

// This is where all the routes will go.
require("./routes/main")(app, shopData);

// This is where we start the web app listening.
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
