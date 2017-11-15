"use strict";

const { pack, unpack } = require('./crypt');

module.exports = function(io) {

    /**
     * Active users record
     * users: {
     *     socket_id: socket_client_public_key
     * }
     */
    const sockets = {};

    io.on('connection', (socket) => {

        console.log(`Made socket connection: ${socket.id}`);

        sockets[socket.id] = "";
        console.log(Object.keys(sockets));

        socket.on('init-session', (data) => {
            if (data.status) {
                sockets[socket.id] = data.key;
                socket.emit('init-session', {
                    status: true,
                    key: process.env.SERVER_PUBLIC_KEY
                });
            }
        });

        socket.on('disconnect', () => {
            delete sockets[socket.id];
            console.log(`Socket disconnected: ${socket.id}`);
        });

        socket.on('message', (data) => {
            var keys = Object.keys(sockets);
            for (var i = 0; i < keys.length; i++) {
                socket.to(keys[i]).emit('message', pack(sockets[keys[i]], unpack(data)));
            }
            socket.emit('message', pack(sockets[socket.id], unpack(data)));
        });

        socket.on('typing', (data) => {
            var keys = Object.keys(sockets);
            for (var i = 0; i < keys.length; i++) {
                socket.to(keys[i]).emit('typing', pack(sockets[keys[i]], unpack(data)));
            }
        });
    });
};