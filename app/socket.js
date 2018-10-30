"use strict";

const { pack, unpack } = require('./crypt');

const socket_io = function (io) {
    const sockets = {};

    io.on('connection', (socket) => {

        console.log(`Made socket connection: ${socket.id}`);
        console.log('sockets: ' + Object.keys(sockets));

        // session-initialization event
        socket.on('init-session', (data) => {
            if (data.status) {
                sockets[socket.id] = data.key;
                socket.emit('init-session', {
                    status: true,
                    key: process.env.SERVER_PUBLIC_KEY
                });
            }
        });

        // socket disconnect event listener
        socket.on('disconnect', () => {
            delete sockets[socket.id];
            console.log(`Socket disconnected: ${socket.id}`);
            console.log('sockets: ' + Object.keys(sockets));
        });

        // message event listener
        socket.on('message', (data) => {
            var keys = Object.keys(sockets);
            for (var i = 0; i < keys.length; i++) {
                socket.to(keys[i]).emit('message', pack(sockets[keys[i]], unpack(data)));
            }
            socket.emit('message', pack(sockets[socket.id], unpack(data)));
        });

        // typing event listener
        socket.on('typing', (data) => {
            var keys = Object.keys(sockets);
            for (var i = 0; i < keys.length; i++) {
                socket.to(keys[i]).emit('typing', pack(sockets[keys[i]], unpack(data)));
            }
        });
    });
};

module.exports = socket_io;