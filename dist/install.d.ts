import { ComponentFile } from './download';
export declare function installComponent(files: ComponentFile[], targetDir: string, dependencies?: Record<string, string>, devDependencies?: Record<string, string>, force?: boolean): Promise<boolean>;
