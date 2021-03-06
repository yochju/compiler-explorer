// Copyright (c) 2016, Matt Godbolt
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

const _ = require('underscore'),
    crypto = require('crypto');

const tabsRe = /\t/g;
const lineRe = /\r?\n/;

function splitLines(text) {
    const result = text.split(lineRe);
    if (result.length > 0 && result[result.length - 1] === '')
        return result.slice(0, result.length - 1);
    return result;
}

exports.splitLines = splitLines;

function eachLine(text, func, context) {
    return _.each(splitLines(text), func, context);
}

exports.eachLine = eachLine;

function expandTabs(line) {
    let extraChars = 0;
    return line.replace(tabsRe, function (match, offset) {
        const total = offset + extraChars;
        const spacesNeeded = (total + 8) & 7;
        extraChars += spacesNeeded - 1;
        return "        ".substr(spacesNeeded);
    });
}

exports.expandTabs = expandTabs;

function parseOutput(lines, inputFilename, pathPrefix) {
    const re = /^\s*<source>[:(]([0-9]+)(:?,?([0-9]+):?)?[):]*\s*(.*)/;
    const result = [];
    eachLine(lines, function (line) {
        line = line.split('<stdin>').join('<source>');
        if (pathPrefix) line = line.replace(pathPrefix, "");
        if (inputFilename) line = line.split(inputFilename).join('<source>');
        if (line !== "" && line.indexOf("fixme:") !== 0) {
            const lineObj = {text: line};
            const match = line.replace(/\x1b\[[\d;]*[mK]/g, '').match(re);
            if (match) {
                lineObj.tag = {
                    line: parseInt(match[1]),
                    column: parseInt(match[3] || "0"),
                    text: match[4].trim()
                };
            }
            result.push(lineObj);
        }
    });
    return result;
}

exports.parseOutput = parseOutput;

function padRight(name, len) {
    while (name.length < len) name = name + ' ';
    return name;
}

exports.padRight = padRight;

/***
 * Anonymizes given IP.
 * For IPv4, it removes the last octet
 * For IPv6, it removes the last three hextets
 *
 * @param ip {String} IP (localhost|IPv4|IPv6)
 * @returns {String} Anonymized IP
 */
exports.anonymizeIp = function anonymizeIp(ip) {
    if (ip.includes('localhost')) {
        return ip;
    }
    else if (ip.includes(':')) {
        // IPv6
        return ip.replace(/:[\da-fA-F]{0,4}:[\da-fA-F]{0,4}:[\da-fA-F]{0,4}$/, ':0:0:0');
    } else {
        // IPv4
        return ip.replace(/\.\d{1,3}$/, '.0');
    }
};

/***
 * Gets the hash of the given object
 *
 * Limitation: object shall not have circular references
 * @param object {*} Object to get hash from
 * @param HashVersion {String} Hash "version"
 * @returns {String} Hash of object
 */
exports.getHash = function getHash(object, HashVersion = 'Compiler Explorer Default Version 1') {
    // See https://stackoverflow.com/questions/899574/which-is-best-to-use-typeof-or-instanceof/6625960#6625960
    const asString = (typeof(object) === 'string') ? object : JSON.stringify(object);
    return crypto.createHmac('sha256', HashVersion)
        .update(asString)
        .digest('hex');
};
