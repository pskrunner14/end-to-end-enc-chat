"use strict";

// socket.io server address
var socket_server_address = document.URL;

// query dom
var message = document.querySelector('#message'),
    handle = document.querySelector('#handle'),
    button = document.querySelector('#send'),
    output = document.querySelector('#output'),
    feedback = document.querySelector('#feedback');

// load session RSA keys from storage if any
loadSessionKeys();

// connect to socket server
var socket = io.connect(socket_server_address);

// key exchange after connection
// emit 'init-session' event with client's public key
socket.emit('init-session', {
    status: true,
    key: sessionKeys.client.public
});

// listen for 'init-session' event 
// receive server's public key and store in session storage
socket.on('init-session', (data) => {
    loadEncryptionObjects(data.key);
});

// message event emitter
button.addEventListener('click', () => {
    var encryptedData = pack({
        message: message.value,
        handle: handle.value
    });
    console.log(encryptedData);
    socket.emit('message', encryptedData);
    message.value = '';
});

// typing event emitter
message.addEventListener('keypress', () => {
    var encryptedData = pack({
        handle: handle.value
    });
    socket.emit('typing', encryptedData);
});

// message event listener
socket.on('message', (data) => {
    feedback.innerHTML = '';
    var decryptedData = unpack(data);
    output.innerHTML += `<p><strong>${decryptedData.handle}:</strong> ${decryptedData.message}</p>`;
});

// typing event listener
socket.on('typing', (data) => {
    var decryptedData = unpack(data);
    feedback.innerHTML = `<p><em>${decryptedData.handle} is typing a message...</em></p>`;
});