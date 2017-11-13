"use strict";

// SECURITY_LEVEL is the encryption key size in bits
var SECURITY_LEVEL = 2048;
// internet explorer can't handle 2048 bit key generation in a reasonable amount of time, so we use 1024 bit.
//   this will have minimal impact as the credentials are secured using an externally transmitted verification
//   code and cracking the client->server comms won't (usually) compromise server->client comms
//   if client->server comms being compromised is a serious problem, then simply force the user to wait
if ((window.navigator.userAgent.indexOf('MSIE') > 0) ||
    (window.navigator.userAgent.indexOf('Trident/7') > 0) ||
    (window.navigator.userAgent.indexOf('Edge/') > 0)) {
    SECURITY_LEVEL = 1024;
}

// RSA keys used to secure the session
var sessionKeys = {
    client: {},
    server: {}
};

var encrypter, decrypter;

function generateRandomString(length) {
    var text = "";
    var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
}

// generate the client's keys for the session
function generateSessionKeys() {
    console.log('generating ' + SECURITY_LEVEL + '-bit key pair...');
    var crypt = new JSEncrypt({ default_key_size: SECURITY_LEVEL });
    var dt = new Date();
    var time = -(dt.getTime());
    crypt.getKey();
    dt = new Date();
    time += (dt.getTime());
    console.log('Keys Generated in ' + time + ' ms');

    sessionKeys.client = {
        'private': crypt.getPrivateKey(),
        'public': crypt.getPublicKey()
    };
}

// configure the encrypter and decrypter objects
// to be called after key exchange
function loadEncryptionObjects(serverPublicKey) {
    sessionKeys.server.public = serverPublicKey;
    // store sessionKeys in html storage
    if (typeof(Storage) !== "undefined") {
        sessionStorage.RSAKeys = JSON.stringify(rsa.keys);
        console.log('session key stored: ' + sessionStorage.RSAKeys);
    }

    // server's public key is used to encrypt AES secrets
    encrypter = new JSEncrypt();
    encrypter.setPublicKey(sessionKeys.server.public);
    // client's private key is used to decrypt AES secrets
    decrypter = new JSEncrypt();
    decrypter.setPrivateKey(sessionKeys.client.private);
}

// load existing session keys from storage or generate new keys
function loadSessionKeys() {
    // ensure html5 storage available
    if (typeof(Storage) !== "undefined") {

        if (sessionStorage.RSAKeys) {
            sessionKeys = JSON.parse(sessionStorage.RSAKeys);
            console.log('client keys loaded from session storage');
        } else {
            generateSessionKeys();
            sessionStorage.RSAKeys = JSON.stringify(sessionKeys);
            console.log('session keys saved to storage');
        }
    } else {
        console.log('Sorry! No Web Storage support..');
        // it's possible to continue with new keys generated per page,
        // but then you'll have to repeat the key exchange with a new code
    }
}

var aes = {
    // text should be JSON encoded
    encrypt: function(secret, text) {
        // hash secret to 256 bit (32 byte) key using md5
        var secretHash = md5(secret);
        var key = aesjs.util.convertStringToBytes(secretHash);
        var textBytes = aesjs.util.convertStringToBytes(text);
        var aesCtr = new aesjs.ModeOfOperation.ctr(key);
        var encryptedBytes = aesCtr.encrypt(textBytes);
        return encryptedBytes;
    },

    decrypt: function(secret, encryptedBytes) {
        // convert node.js buffer object to byte array
        if (encryptedBytes.type && (encryptedBytes.type == "Buffer")) {
            encryptedBytes = encryptedBytes.data;
        }
        // hash secret to 256 bit (32 byte) key
        var secretHash = md5(secret);
        var key = aesjs.util.convertStringToBytes(secretHash);
        var aesCtr = new aesjs.ModeOfOperation.ctr(key);
        var decryptedBytes = aesCtr.decrypt(encryptedBytes);
        return aesjs.util.convertBytesToString(decryptedBytes);
    },

    generateKey: function() {
        return generateRandomString(32);
    }
};

function packMessageData(data) {
    var packedData = {};
    // generate aes key
    var aesKey = aes.generateKey();
    try {
        // add encrypted aes key to output
        packedData.key = encrypter.encrypt(aesKey);
        // add encrypted data to output
        packedData.encrypted = aes.encrypt(aesKey, JSON.stringify(data));
        return packedData;
    } catch (dataEncryptionException) {
        console.log('failed to pack message: ' + dataEncryptionException.message);
        return {};
    }
}

function unpackMessageData(data) {
    var secret = decrypter.decrypt(data.key);
    var message = JSON.parse(aes.decrypt(secret, data.encrypted));
}