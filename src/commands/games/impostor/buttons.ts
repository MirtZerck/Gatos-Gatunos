import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChatInputCommandInteraction,
    ButtonInteraction
} from 'discord.js';
import { GameRoom } from './state.js';

export function createLobbyButtons(useCustomThemes: boolean): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('impostor_join')
            .setLabel('Unirse')
            .setEmoji('👥')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('impostor_start')
            .setLabel('Empezar')
            .setEmoji('🎮')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('impostor_toggle_custom')
            .setLabel(useCustomThemes ? 'Desactivar Personalizado' : 'Activar Personalizado')
            .setEmoji('🎭')
            .setStyle(useCustomThemes ? ButtonStyle.Secondary : ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('impostor_leave')
            .setLabel('Salir')
            .setEmoji('🚪')
            .setStyle(ButtonStyle.Secondary)
    );
}

export function createGameButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('impostor_skip')
            .setLabel('Votar Skip')
            .setEmoji('🗳️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('impostor_start_vote')
            .setLabel('Empezar Votación')
            .setEmoji('🗳️')
            .setStyle(ButtonStyle.Danger)
    );
}

export function createNextRoundButton(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('impostor_next_round')
            .setLabel('Siguiente Ronda')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Success)
    );
}

export async function createVoteSelectMenu(
    room: GameRoom,
    client: ChatInputCommandInteraction['client'] | ButtonInteraction['client'],
    guildId: string
): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
    const options: StringSelectMenuOptionBuilder[] = [];
    const guild = client.guilds.cache.get(guildId);

    for (const playerId of room.alivePlayers) {
        const member = await guild!.members.fetch(playerId);
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(member.displayName)
                .setValue(playerId)
        );
    }

    options.push(
        new StringSelectMenuOptionBuilder()
            .setLabel('Saltar voto (no expulsar a nadie)')
            .setValue('skip')
            .setDescription('Votar para no expulsar a nadie esta ronda')
    );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('impostor_vote_select')
        .setPlaceholder('Selecciona a quién expulsar')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}
