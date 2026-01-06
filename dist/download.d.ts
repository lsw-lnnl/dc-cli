/// <reference types="node" />
/// <reference types="node" />
export interface ComponentFile {
    path: string;
    content: string | Buffer;
    isBinary: boolean;
}
export interface DownloadResult {
    files: ComponentFile[];
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
}
export declare function downloadComponent(gitUrl: string, componentPath: string, branch?: string): Promise<DownloadResult>;
