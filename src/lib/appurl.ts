export type PathComponent = string;

export function parsePath(path: string): PathComponent[] {
    return path.split('/').filter((part) => !!part);
}

export function buildPath(components: PathComponent[]): string {
    return '/' + components.join('/');
}

export function rebuildPath(path: string): string {
    return buildPath(parsePath(path));
}

export function joinPath(basePath: string, components: PathComponent[]): string {
    const baseComponents = parsePath(basePath);
    return buildPath([...baseComponents, ...components]);
}

export function basePath(path: string) {
    const components = parsePath(path);
    if (components.length <= 0) return '/';
    return buildPath(components.slice(0, -1));
}

