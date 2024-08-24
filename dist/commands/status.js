import axios from 'axios';
export const handleStatusCommand = async (message, args) => {
    if (args.length !== 1) {
        message.channel.send('Please provide a valid token ticker.');
        return;
    }
    const token = args[0].toUpperCase();
    try {
        const response = await axios.get(`${process.env.API_BASE_URL}/token/${token}?stat=true&holder=true`);
        const tokenData = response.data.result[0];
        const embed = {
            color: 7391162,
            title: `Mint Status for ${token}`,
            fields: [
                { name: 'Max Supply', value: tokenData.max, inline: true },
                { name: 'Minted', value: tokenData.minted, inline: true },
                { name: 'Holders', value: tokenData.holderTotal || 'N/A', inline: true }
            ],
            footer: { text: 'x.com/NachoWyborski' },
            author: {
                name: 'Nacho the 𐤊at',
                icon_url: 'https://coinchimp-240602.nacho-react.pages.dev/nacho_bot_logo.png'
            },
            image: {
                url: 'https://i.ibb.co/G0BvQCs/nachobot-banner1small.png'
            }
        };
        message.channel.send({ embeds: [embed] });
    }
    catch (error) {
        console.error('Failed to fetch token data:', error);
        message.channel.send('Failed to fetch token data. Please try again.');
    }
};
