"use strict";

// environment vars config
require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const socketIO = require('socket.io');
const session = require('express-session');
const path = require('path');

const { generateKeys } = require('./app/crypt');

const PORT = process.env.PORT || 3000;
const app = express();

const keys = generateKeys();

process.env.SERVER_PUBLIC_KEY = keys.public;
process.env.SERVER_PRIVATE_KEY = keys.private;

// session configuration
const session_config = {
    secret: process.env.SESSION_SECRET,
    cookie: {
        maxAge: 60000
    },
    resave: false,
    saveUninitialized: false
};

// app middleware
app.use(morgan('dev'));
app.use(session(session_config));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// app routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const server = app.listen(PORT, () => {
    const HOST = server.address().address === '::' ? "localhost" : server.address().address;
    console.log(`Server listening on http://${HOST}:${PORT}`);
});

// Socket.io Server Config
const io = socketIO(server);
require('./app/socket')(io);

// Error Handling
app.use((req, res, next) => {
    res.status(404).send("Oh uh, something went wrong");
});

const shutdown = function (message, err) {
    console.log(`${message}: shutting down...`);
    console.error(err);
    process.exit(1);
}

process.on('uncaughtException', (err) => {
    return shutdown('Uncaught excecption occurred', err);
});