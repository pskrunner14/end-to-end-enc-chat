"use strict";

const crypto = require('crypto');
const aesjs = require('aes-js');
const NodeRSA = require('node-rsa');
const randomstring = require("randomstring");

// SECURITY_LEVEL is the encryption key size in bits
const SECURITY_LEVEL = 2048;

// used to generate a random md5 hash to create secret key
const generateRandomKey = function() {
    return crypto.createHash('md5').update(randomstring.generate()).digest("hex");
};

// used to encrypt and decrypt data using secret key
const aes = {
    encrypt: function(secret, text) {
        const secretHash = crypto.createHash('md5').update(secret).digest("hex");
        const key = aesjs.utils.utf8.toBytes(secretHash);
        const textBytes = aesjs.utils.utf8.toBytes(text);
        const aesCtr = new aesjs.ModeOfOperation.ctr(key);
        const encryptedBytes = aesCtr.encrypt(textBytes);
        return encryptedBytes;
    },

    decrypt: function(secret, encryptedBytes) {
        const secretHash = crypto.createHash('md5').update(secret).digest("hex");
        const key = aesjs.utils.utf8.toBytes(secretHash);
        const aesCtr = new aesjs.ModeOfOperation.ctr(key);
        const decryptedBytes = aesCtr.decrypt(encryptedBytes);
        return aesjs.utils.utf8.fromBytes(decryptedBytes);
    },
};

// used to encrypt and decrypt md5 hash to
// create secret key used by aes to encrypt data
const rsa = {

    // both parameters must be strings, publicKey PEM formatted
    encrypt: function(clientPublicKey, message) {
        const buffer = new Buffer(message);

        // padding type must be compatible with client-side packages
        const encrypted = crypto.publicEncrypt({
                key: clientPublicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            buffer
        );
        return encrypted.toString('base64');
    },

    // both parameters must be strings, publicKey PEM formatted
    decrypt: function(message) {
        const buffer = new Buffer(message, 'base64');

        // padding type must be compatible with client-side packages
        const decrypted = crypto.privateDecrypt({
                key: process.env.SERVER_PRIVATE_KEY,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            buffer
        );
        return decrypted.toString('utf8');
    }
};

// generate PEM formatted public / private key pair
const generateKeys = function() {
    const key = new NodeRSA({ b: SECURITY_LEVEL });

    // formatting must be compatible with client-side packages
    return {
        'private': key.exportKey('pkcs1-private-pem'),
        'public': key.exportKey('pkcs8-public-pem')
    };
};

// pack the data using the receiver's public key
const pack = function(clientPublicKey, data) {
    const packedData = {};
    // generate aes key
    const aesKey = generateRandomKey();
    // add encrypted aes key to output
    packedData.key = rsa.encrypt(clientPublicKey, aesKey);
    // add encrypted data to output
    packedData.encrypted = aes.encrypt(aesKey, JSON.stringify(data));
    return packedData;
};

// unpack the encrypted data using secret key
const unpack = function(data) {
    // decrypt the secret key using server private key
    const aesKey = rsa.decrypt(data.key);
    var encryptedData = [];
    var keys = Object.keys(data.encrypted);
    for (var i = 0; i < keys.length; i++) {
        encryptedData[i] = data.encrypted[keys[i]];
    }
    return aes.decrypt(aesKey, new Uint8Array(encryptedData));
};

module.exports = {
    pack: pack,
    unpack: unpack,
    generateKeys: generateKeys
};