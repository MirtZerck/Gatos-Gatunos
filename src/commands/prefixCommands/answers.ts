import { CommandManager } from "../../events/commandHandler.js";
import { prefijo } from "../../constants/prefix.js";
import { getRandomNumber } from "../../utils/utilsFunctions.js";
import { EmbedBuilder, Events, Client, Message, MessageType, ChannelType } from "discord.js";
import { CommandsService } from "../../db_service/commandsService.js";
import { CustomImageURLOptions } from "../../types/embeds.js";
import { getDynamicColor } from "../../utils/getDynamicColor.js";
import { PrefixCommand } from "../../types/command.js";

export const onMessageCreate = async (client: Client): Promise<void> => {
    const prefix = prefijo;
    const commandManager = new CommandManager();

    client.on(Events.MessageCreate, async (message: Message) => {
        if (message.author.bot || message.type !== MessageType.Default || message.channel.type !== ChannelType.GuildText) return;

        if (!message.content.startsWith(prefix)) return;

        const content = message.content.slice(prefix.length);
        const args = content.split(" ");
        const commandName = args.shift()!.toLowerCase();
        const commandBody = content.slice(commandName.length).trim();

        const commandDB = new CommandsService(message.guild!.id);
        const commandFound = await commandDB.getCommandsValue(commandName);

        const dynamicColor = getDynamicColor(message.member!)

        if (commandFound) {
            try {
                const categoria = commandFound[0];
                const reply = commandFound[1][commandName];

                switch (categoria) {
                    case "replys": {
                        const respuesta = CommandsService.replaceArgumentText(
                            reply,
                            message,
                            commandBody,
                            commandName,
                            args
                        );
                        const respuestaFormateado = respuesta.replace(/\\n/g, "\n");

                        message.channel.send(respuestaFormateado);
                        break;
                    }
                    case "delete_replys": {
                        const delete_respuesta = CommandsService.replaceArgumentText(
                            reply,
                            message,
                            commandBody,
                            commandName,
                            args
                        );
                        const deleteRespuestaFormateado = delete_respuesta.replace(
                            /\\n/g,
                            "\n"
                        );

                        await message.channel.send(deleteRespuestaFormateado);
                        await message.delete();
                        break;
                    }
                    case "random_replys": {
                        const values = Object.values(reply);
                        const index = getRandomNumber(0, values.length - 1);
                        const messageDb = values[index];
                        const linkindex = "https";

                        if (messageDb.startsWith(linkindex)) {
                            const randomEmbed = new EmbedBuilder()
                                .setAuthor({
                                    name: message.member!.displayName,
                                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                                })
                                .setTitle(`${commandName}`)
                                .setImage(messageDb)
                                .setColor(dynamicColor)
                                .setTimestamp();

                            await message.channel.send({ embeds: [randomEmbed] });
                            break;
                        } else {
                            await message.channel.send(values[index]);
                            break;
                        }
                    }

                    case "personalizados": {
                        const values = Object.values(reply);
                        const index = getRandomNumber(0, values.length - 1);
                        const messageDb = values[index];
                        const linkindex = "https";

                        if (messageDb.startsWith(linkindex)) {
                            const randomEmbed = new EmbedBuilder()
                                .setAuthor({
                                    name: message.member!.displayName,
                                    iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                                })
                                .setTitle(`${commandName}`)
                                .setImage(messageDb)
                                .setColor(dynamicColor)
                                .setTimestamp();

                            await message.channel.send({ embeds: [randomEmbed] });
                            break;
                        } else {
                            await message.channel.send(values[index]);
                            break;
                        }
                    }

                    case "linksImages": {
                        const imageEmbed = new EmbedBuilder()
                            .setAuthor({
                                name: message.member!.displayName,
                                iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions),
                            })
                            .setTitle(`${commandName}`)
                            .setImage(reply)
                            .setColor(dynamicColor)
                            .setTimestamp();

                        await message.channel.send({ embeds: [imageEmbed] });
                        break;
                    }

                    case "clanes": {
                        const values = Object.values(reply);
                        const img = values[0];
                        const text = values[1];
                        const respuesta = CommandsService.replaceArgumentText(
                            text,
                            message,
                            commandBody,
                            commandName,
                            args
                        );
                        const respuestaFormateado = respuesta.replace(/\\n/g, "\n");

                        const imageEmbed = new EmbedBuilder()
                            .setAuthor({
                                name: message.member?.nickname ?? message.author.username,
                                iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions)
                            })
                            .setTitle(`Invitación al Clan`)
                            .setDescription(respuestaFormateado)
                            .setImage(img)
                            .setColor(dynamicColor)
                            .setTimestamp();

                        await message.channel.send({ embeds: [imageEmbed] });

                        break;
                    }
                    case "info": {
                        const values = Object.values(reply);
                        const img = values[0];
                        const text = values[1];
                        const respuesta = CommandsService.replaceArgumentText(
                            text,
                            message,
                            commandBody,
                            commandName,
                            args
                        );
                        const respuestaFormateado = respuesta.replace(/\\n/g, "\n");

                        const imageEmbed = new EmbedBuilder()
                            .setAuthor({
                                name: message.member?.nickname ?? message.author.username,
                                iconURL: message.author.displayAvatarURL({ dynamic: true } as CustomImageURLOptions)
                            })
                            .setTitle(`Información Importante`)
                            .setDescription(respuestaFormateado)
                            .setImage(img)
                            .setColor(dynamicColor)
                            .setTimestamp();

                        await message.channel.send({ embeds: [imageEmbed] });

                        break;
                    }
                }
            } catch (error) {
                console.error("Error al procesar el comando:", error);
            }
        } else {
            const command = commandManager.prefixCommands.get(commandName) || 
                          Array.from(commandManager.prefixCommands.values()).find((cmd: PrefixCommand) => 
                              cmd.name === commandName || (cmd.alias && cmd.alias.includes(commandName))
                          );

            if (command) {
                try {
                    await command.execute(message, args);
                } catch (error) {
                    console.error(`Error executing command ${commandName}:`, error);
                    await message.reply("Hubo un error al ejecutar el comando.").catch(console.error);
                }
            }
        }
    });
};
