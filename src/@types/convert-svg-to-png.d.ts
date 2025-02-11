declare module 'convert-svg-to-png' {
    export interface ConvertOptions {
        width?: number;
        height?: number;
        scale?: number;
        puppeteer?: {
            args?: string[];
            executablePath?: string;
        };
        outputFilePath?: string;
    }

    export function convert(input: string | Buffer, options?: ConvertOptions): Promise<Buffer>;
    export function convertFile(inputPath: string, options?: ConvertOptions): Promise<string>;
}
