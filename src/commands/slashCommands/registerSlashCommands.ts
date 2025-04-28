import { REST, Routes } from "discord.js";
import { arraySlashCommands } from "./slashIndex.js";
import { APPLICATION_ID, token } from "../../michi.js";

export async function registerSlashCommands() {
    try {
        const slashCommands = arraySlashCommands.map((command) => {
            // Convert the command data to a plain object
            const commandData = command.data.toJSON();
            return commandData;
        });

        const rest = new REST({ version: "10" }).setToken(token);

        console.log("Empezando a registrar los Slash Commands...");

        await rest
            .put(Routes.applicationCommands(APPLICATION_ID), {
                body: slashCommands,
            })
            .then((res) => {
                console.log("Slash Commands Registrados Correctamente");
            })
            .catch((error) => {
                console.error("Error registrando Slash Commands:", error);
            });
    } catch (error) {
        console.error("Error en registerSlashCommands:", error);
    }
}
