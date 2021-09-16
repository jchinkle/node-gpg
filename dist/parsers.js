"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseKeysFromOutput = void 0;
// eslint-disable-next-line no-control-regex
const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi;
const parseKeysFromOutput = (output) => {
    const [first, second] = output.split(/-----+/).map((l) => l.trim());
    const ourFocus = second || first;
    const lines = ["", ...ourFocus.split("\n").map((l) => l.trim())];
    return lines.reduce((keys, line) => {
        var _a;
        if (line === "") {
            return keys.concat({});
        }
        const lastKey = keys[keys.length - 1];
        if (line.startsWith("pub")) {
            const [created_at, expires_at] = line
                .match(/(\d{4}-\d{2}-\d{2}) .+ (\d{4}-\d{2}-\d{2})/)
                .slice(1);
            lastKey.created_at = created_at;
            lastKey.expires_at = expires_at;
        }
        else if (line.startsWith("uid")) {
            const [ourFocus] = line.split("]").slice(1);
            const [name] = ((_a = ourFocus.match(/(.+ <(.+)>)/)) === null || _a === void 0 ? void 0 : _a.slice(1)) || [];
            const [email] = ourFocus.match(emailRegex);
            lastKey.username = (name === null || name === void 0 ? void 0 : name.trim().replace('"', "")) || email;
        }
        else if (line.trim().startsWith("Keygrip")) {
            const [keygrip] = line.split(" = ").slice(1);
            lastKey.keygrip = keygrip;
        }
        else if (!line.startsWith("sub")) {
            lastKey.id = line;
        }
        return keys;
    }, []);
};
exports.parseKeysFromOutput = parseKeysFromOutput;
//# sourceMappingURL=parsers.js.map