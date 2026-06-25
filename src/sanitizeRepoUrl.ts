export const getNormalizedUrl = (url: string): string => {
    return decodeURIComponent(url.trim());
};
