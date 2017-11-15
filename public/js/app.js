"use strict";

loadSessionKeys();

// server machine's address
var server_address = document.URL;

// make connection
var socket = io.connect(server_address);

socket.emit('init-session', {
    status: true,
    key: sessionKeys.client.public
});

socket.on('init-session', (data) => {
    loadEncryptionObjects(data.key);
});

// query dom
var message = document.querySelector('#message');
var handle = document.querySelector('#handle');
var button = document.querySelector('#send');
var output = document.querySelector('#output');
var feedback = document.querySelector('#feedback');

// emit events
button.addEventListener('click', () => {
    var encryptedData = pack({
        message: message.value,
        handle: handle.value
    });
    console.log(encryptedData);
    socket.emit('message', encryptedData);
    message.value = '';
});

message.addEventListener('keypress', () => {
    var encryptedData = pack({
        handle: handle.value
    });
    socket.emit('typing', encryptedData);
});

// listen for socket events
socket.on('message', (data) => {
    var decryptedData = unpack(data);
    feedback.innerHTML = '';
    output.innerHTML += `<p><strong>${decryptedData.handle}:</strong> ${decryptedData.message}</p>`;
});

socket.on('typing', (data) => {
    var decryptedData = unpack(data);
    feedback.innerHTML = `<p><em>${decryptedData.handle} is typing a message...</em></p>`;
});