// env.d.ts
interface ImportMetaEnv {
    readonly VITE_NGINX_AUTOINDEX_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
