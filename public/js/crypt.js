"use strict";

// SECURITY_LEVEL is the encryption key size in bits
var SECURITY_LEVEL = 2048;

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
        sessionStorage.RSAKeys = JSON.stringify(sessionKeys);
        console.log('session key stored: ' + sessionStorage.RSAKeys);
    }

    // server's public key is used to encrypt AES secrets
    encrypter = new JSEncrypt();
    encrypter.setKey(sessionKeys.server.public);

    // client's private key is used to decrypt AES secrets
    decrypter = new JSEncrypt();
    decrypter.setKey(sessionKeys.client.private);
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
        var key = aesjs.utils.utf8.toBytes(secretHash);
        var textBytes = aesjs.utils.utf8.toBytes(text);
        var aesCtr = new aesjs.ModeOfOperation.ctr(key);
        var encryptedBytes = aesCtr.encrypt(textBytes);
        return encryptedBytes;
    },

    decrypt: function(secret, encryptedBytes) {
        var encryptedData = [];
        var keys = Object.keys(encryptedBytes);
        for (var i = 0; i < keys.length; i++) {
            encryptedData[i] = encryptedBytes[keys[i]];
        }
        // hash secret to 256 bit (32 byte) key
        var secretHash = md5(secret);
        var key = aesjs.utils.utf8.toBytes(secretHash);
        var aesCtr = new aesjs.ModeOfOperation.ctr(key);
        var decryptedBytes = aesCtr.decrypt(encryptedData);
        return aesjs.utils.utf8.fromBytes(decryptedBytes);
    },

    generateKey: function() {
        return generateRandomString(32);
    }
};

function pack(data) {
    var packedData = {};
    // generate aes key
    var aesKey = aes.generateKey();
    try {
        // add encrypted aes-key to output as secret
        packedData.key = encrypter.encrypt(aesKey);
        // add encrypted data to output
        packedData.encrypted = aes.encrypt(aesKey, JSON.stringify(data));
        return packedData;
    } catch (dataEncryptionException) {
        console.log('failed to pack message: ' + dataEncryptionException.message);
        return {};
    }
}

function unpack(data) {
    // decrypt the secret to get aes-key
    var aesKey = decrypter.decrypt(data.key);
    return JSON.parse(JSON.parse(aes.decrypt(aesKey, data.encrypted)));
}