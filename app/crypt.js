"use strict";

const crypto = require('crypto');

const aesjs = require('aes-js');
const NodeRSA = require('node-rsa');
const randomstring = require("randomstring");

const SECURITY_LEVEL = 2048;

const aes = {
    encrypt: function(secret, text) {
        const secretHash = crypto.createHash('md5').update(secret).digest("hex");
        const key = aesjs.util.convertStringToBytes(secretHash);
        const textBytes = aesjs.util.convertStringToBytes(text);
        const aesCtr = new aesjs.ModeOfOperation.ctr(key);
        const encryptedBytes = aesCtr.encrypt(textBytes);
        return encryptedBytes;
    },

    decrypt: function(secret, encryptedBytes) {
        const secretHash = crypto.createHash('md5').update(secret).digest("hex");
        const key = aesjs.util.convertStringToBytes(secretHash);
        const aesCtr = new aesjs.ModeOfOperation.ctr(key);
        const decryptedBytes = aesCtr.decrypt(encryptedBytes);
        return aesjs.util.convertBytesToString(decryptedBytes);
    },

    generateKey: function() {
        return crypto.createHash('md5').update(randomstring.generate()).digest("hex");
    }
};

// generate shared secret for session authentication
const generateSessionSecret = function() {
    // number between 4 and 8
    const secretLength = Math.floor((Math.random() * 5) + 4);

    // secret should not include ambiguous characters like O/0, 1/l
    const secret = randomstring.generate({
        length: secretLength,
        charset: '23456789abcdefghijkmnpqrstuvwxyz'
    });

    return secret;
};

const rsa = {
    // both parameters must be strings, publicKey PEM formatted
    encrypt: function(publicKey, message) {
        const buffer = new Buffer(message);
        // padding type must be compatible with client-side packages
        const encrypted = crypto.publicEncrypt({
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            buffer
        );
        return encrypted.toString('base64');
    },

    // both parameters must be strings, publicKey PEM formatted
    decrypt: function(privateKey, message) {
        const buffer = new Buffer(message, 'base64');
        // padding type must be compatible with client-side packages
        const decrypted = crypto.privateDecrypt({
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            buffer
        );
        return decrypted.toString('utf8');
    },

    // generate PEM formatted public / private key pair
    generateKeys: function() {
        const key = new NodeRSA({ b: SECURITY_LEVEL });

        // formatting must be compatible with client-side packages
        return {
            'private': key.exportKey('pkcs1-private-pem'),
            'public': key.exportKey('pkcs8-public-pem')
        };
    }
};

const pack = function(data) {
    const packedData = {};
    // generate aes key
    const aesKey = aes.generateKey();
    // add encrypted aes key to output
    packedData.key = rsa.encrypt(process.env.CLIENT_PUBLIC_KEY, aesKey);
    // add encrypted data to output
    packedData.encrypted = aes.encrypt(aesKey, JSON.stringify(data));
    return packedData;
};

const unpack = function(data) {
    const aesKey = rsa.decrypt(process.env.SERVER_PRIVATE_KEY, data.key);
    return aes.decrypt(aesKey, data.encrypted);
};

module.exports = {
    pack: pack,
    unpack: unpack,
    aes: aes,
    rsa: rsa,
    generateSessionSecret: generateSessionSecret
};