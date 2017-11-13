"use strict";

const crypt = require('./crypt');
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

        socket.on('disconnect', () => {
            const sockets = users[socket.user_id];
            sockets.splice(sockets.indexOf(socket.id), 1);
            console.log(`User disconnected: ${socket.user_id}`);
            updateUsers();
        });

        socket.on('message', (data) => {

        });
    });

    function updateUsers() {
        io.emit('online_users', users);
    }
};