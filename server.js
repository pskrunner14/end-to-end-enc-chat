"use strict";

require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const socketIO = require('socket.io');
const session = require('express-session');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const app = express();

const getKeys = function(callback) {
    fs.readFile(__dirname + '/../keys/end_to_end.key', function(err, serverPrivateKey) {
        if (err) {
            return gracefullyShutdown('Error reading server private key', err);
        }
        process.env.SERVER_PRIVATE_KEY = serverPrivateKey;
        fs.readFile(__dirname + '/../keys/end_to_end.pub', function(err, clientPublicKey) {
            if (err) {
                return gracefullyShutdown('Error reading client public key', err);
            }
            process.env.CLIENT_PUBLIC_KEY = clientPublicKey;
            console.log('Keys successfully initialized');
        });
    });
};

getKeys();

const session_config = {
    secret: process.env.SESSION_SECRET,
    cookie: {
        maxAge: 60000
    },
    resave: false,
    saveUninitialized: false
};

app.use(morgan('common'));
app.use(session(session_config));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use((req, res, next) => {
    res.status(404).send("Oh uh, something went wrong");
});

process.on('uncaughtException', (err) => {
    return gracefullyShutdown('Uncaught excecption occurred', err);
});

const server = app.listen(PORT, () => {
    const HOST = server.address().address === '::' ? "localhost" : server.address().address;
    console.log(`Server listening on http://${HOST}:${PORT}`);
});

const io = socketIO(server);

require('./app/socket')(io);

function gracefullyShutdown(message, err) {
    console.log(`${message}: gracefully shutting down...`);
    console.error(err);
    process.exit(1);
}