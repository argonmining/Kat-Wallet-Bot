"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMintStatus = exports.fetchMintStatus = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fetchMintStatus = async (apiBaseUrl, token) => {
    const url = `${apiBaseUrl}/token/${token}?stat=true&holder=true`;
    const response = await axios_1.default.get(url);
    return response.data;
};
exports.fetchMintStatus = fetchMintStatus;
const formatMintStatus = (data) => {
    const templatePath = path_1.default.join(__dirname, '../../message_template.json');
    const templateContent = fs_1.default.readFileSync(templatePath, 'utf8');
    const template = JSON.parse(templateContent);
    const tokenData = data.result[0];
    let formattedMessage = `**Mint Status for ${tokenData.tick.toUpperCase()}**\n\n`;
    formattedMessage += `**Max Supply**: ${tokenData.max}\n`;
    formattedMessage += `**Minted**: ${tokenData.minted}\n`;
    formattedMessage += `**Holders**: ${tokenData.holderTotal || 'N/A'}\n`;
    return formattedMessage;
};
exports.formatMintStatus = formatMintStatus;
