"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatHolderData = exports.fetchHolderData = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fetchHolderData = async (apiBaseUrl, address) => {
    const url = `${apiBaseUrl}/address/${address}/tokenlist`;
    const response = await axios_1.default.get(url);
    return response.data;
};
exports.fetchHolderData = fetchHolderData;
const formatHolderData = (data, address) => {
    const templatePath = path_1.default.join(__dirname, '../../message_template.json');
    const templateContent = fs_1.default.readFileSync(templatePath, 'utf8');
    const template = JSON.parse(templateContent);
    let formattedMessage = `**KRC20 Balance for ${address}**\n\n`;
    data.result.forEach((token) => {
        const balance = parseFloat(token.balance) / Math.pow(10, parseInt(token.dec, 10));
        formattedMessage += `**${token.tick.toUpperCase()}**: ${balance.toFixed(2)}\n`;
    });
    return formattedMessage;
};
exports.formatHolderData = formatHolderData;
