export const ANSI = {
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',
    UNDERLINE: '\x1b[4m',

    BLACK: '\x1b[30m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',

    BG_BLACK: '\x1b[40m',
    BG_RED: '\x1b[41m',
    BG_GREEN: '\x1b[42m',
    BG_YELLOW: '\x1b[43m',
    BG_BLUE: '\x1b[44m',
    BG_MAGENTA: '\x1b[45m',
    BG_CYAN: '\x1b[46m',
    BG_WHITE: '\x1b[47m',

    BRIGHT_BLACK: '\x1b[90m',
    BRIGHT_RED: '\x1b[91m',
    BRIGHT_GREEN: '\x1b[92m',
    BRIGHT_YELLOW: '\x1b[93m',
    BRIGHT_BLUE: '\x1b[94m',
    BRIGHT_MAGENTA: '\x1b[95m',
    BRIGHT_CYAN: '\x1b[96m',
    BRIGHT_WHITE: '\x1b[97m'
} as const;

export class AnsiFormatter {
    static format(text: string, ...styles: string[]): string {
        return `${styles.join('')}${text}${ANSI.RESET}`;
    }

    static codeBlock(content: string, language: string = 'ansi'): string {
        return `\`\`\`${language}\n${content}\n\`\`\``;
    }

    static success(text: string): string {
        return this.format(text, ANSI.BRIGHT_GREEN, ANSI.BOLD);
    }

    static error(text: string): string {
        return this.format(text, ANSI.BRIGHT_RED, ANSI.BOLD);
    }

    static warning(text: string): string {
        return this.format(text, ANSI.BRIGHT_YELLOW, ANSI.BOLD);
    }

    static info(text: string): string {
        return this.format(text, ANSI.BRIGHT_CYAN, ANSI.BOLD);
    }

    static header(text: string): string {
        return this.format(text, ANSI.BRIGHT_MAGENTA, ANSI.BOLD, ANSI.UNDERLINE);
    }

    static key(text: string): string {
        return this.format(text, ANSI.CYAN);
    }

    static value(text: string): string {
        return this.format(text, ANSI.BRIGHT_WHITE, ANSI.BOLD);
    }

    static dim(text: string): string {
        return this.format(text, ANSI.BRIGHT_BLACK);
    }

    static devCommand(content: string): string {
        return this.codeBlock(content, 'ansi');
    }

    static devResponse(title: string, sections: Record<string, string>[]): string {
        let output = `${this.header(`╔══ ${title} ══╗`)}\n`;

        for (const section of sections) {
            for (const [key, value] of Object.entries(section)) {
                output += `${this.key(key)}: ${this.value(value)}\n`;
            }
        }

        output += this.dim('╚═══════════════════╝');

        return this.codeBlock(output);
    }

    static table(headers: string[], rows: string[][]): string {
        const columnWidths = headers.map((header, i) => {
            const maxInColumn = Math.max(
                header.length,
                ...rows.map(row => (row[i] || '').toString().length)
            );
            return maxInColumn;
        });

        let output = '';

        output += this.format(
            headers.map((h, i) => h.padEnd(columnWidths[i])).join(' │ '),
            ANSI.BRIGHT_CYAN,
            ANSI.BOLD
        ) + '\n';

        output += this.dim('─'.repeat(columnWidths.reduce((a, b) => a + b + 3, -3))) + '\n';

        for (const row of rows) {
            output += row.map((cell, i) => {
                return this.format(cell.toString().padEnd(columnWidths[i]), ANSI.BRIGHT_WHITE);
            }).join(' │ ') + '\n';
        }

        return this.codeBlock(output);
    }

    static parseCodeBlock(message: string): { language: string; content: string } | null {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
        const match = message.match(codeBlockRegex);

        if (!match) return null;

        return {
            language: match[1] || '',
            content: match[2].trim()
        };
    }
}
