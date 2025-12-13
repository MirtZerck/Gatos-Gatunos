import { EmbedBuilder } from 'discord.js';
import { config } from '../../../config.js';
import { EMOJIS } from '../../../utils/constants.js';
import { SPOTIFY_GREEN } from './constants.js';

export function createHelpEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(SPOTIFY_GREEN)
        .setTitle(`${EMOJIS.MUSIC} Sistema de Musica`)
        .setDescription(
            `**Uso:** \`${config.prefix}music <comando> [opciones]\`\n\n` +
            `**Comandos disponibles:**\n` +
            `\`play\` (\`p\`) <busqueda/URL> - Reproduce musica\n` +
            `\`pause\` - Pausa la reproduccion\n` +
            `\`resume\` - Reanuda la reproduccion\n` +
            `\`skip\` (\`s\`) - Salta la cancion actual\n` +
            `\`stop\` - Detiene y limpia la cola\n` +
            `\`queue\` (\`q\`) [pagina] - Muestra la cola\n` +
            `\`nowplaying\` (\`np\`) - Cancion actual\n` +
            `\`volume\` (\`vol\`) <0-100> - Ajusta volumen\n` +
            `\`shuffle\` - Mezcla la cola\n` +
            `\`loop\` - Modo repeticion\n` +
            `\`join\` - Conecta el bot al canal\n` +
            `\`leave\` (\`dc\`) - Desconecta el bot\n\n` +
            `**Ejemplos:**\n` +
            `\`${config.prefix}music play never gonna give you up\`\n` +
            `\`${config.prefix}p https://youtube.com/watch?v=...\`\n` +
            `\`${config.prefix}music vol 50\``
        )
        .setFooter({ text: 'Soporta YouTube, Spotify, SoundCloud y mas' });
}
