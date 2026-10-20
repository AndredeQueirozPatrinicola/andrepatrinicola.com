import type { ServerResponse } from 'node:http';
export function isFile(path: string): Promise<boolean>;
export function sendFile(res: ServerResponse, path: string, status?: number, acceptEncoding?: string): void;
export function resolveIndex(uri: string): string;
