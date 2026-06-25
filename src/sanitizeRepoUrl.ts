import { safeDecode } from './utils.js';

export const getNormalizedUrl = (url: string): string => {
    return safeDecode(url.trim());
};
