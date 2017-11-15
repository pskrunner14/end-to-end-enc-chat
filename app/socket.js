"use strict";

const { pack, unpack } = require('./crypt');
const moment = require('moment');

module.exports = function(io) {

    /**
     * Active users record
     * users: {
     *     user_id: [ socket_id_1, socket_id_2 ]
     * }
     * Key value pairs of user_id and the socket_ids of the sockets they are connected on.
     */
    const users = {};

    io.on('connection', (socket) => {

        console.log(`Made socket connection: ${socket.id}`);

        socket.on('join', (user_id, available) => {
            available(true);
            socket.user_id = user_id;
            users[user_id].push(socket.id);
            updateUsers();
        });

        socket.on('init-session', (data) => {
            if (data.status) {
                process.env.CLIENT_PUBLIC_KEY = data.key;
                socket.emit('init-session', {
                    status: true,
                    key: process.env.SERVER_PUBLIC_KEY
                });
            }
        });

        // socket.on('disconnect', () => {
        //     const sockets = users[socket.user_id];
        //     sockets.splice(sockets.indexOf(socket.id), 1);
        //     console.log(`User disconnected: ${socket.user_id}`);
        //     updateUsers();
        // });

        socket.on('message', (data) => {
            console.log(unpack(data));
        });

        socket.on('typing', (data) => {
            console.log(unpack(data));
        });
    });

    function updateUsers() {
        io.emit('online_users', users);
    }
};