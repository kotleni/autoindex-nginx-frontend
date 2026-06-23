<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useBrowserLocation, useUrlSearchParams } from '@vueuse/core';
import { computed, watch } from 'vue';
import { File, Folder, CornerLeftUp } from '@lucide/vue';

type EntryType = 'directory' | 'file';

interface RawEntry {
    name: string;
    type: EntryType;
    mtime: string;
    size?: number;
}

interface Entry {
    name: string;
    type: EntryType;
    time: Date;
    size?: number;
    link: string;
    isDir: boolean;
}

type SortMode = "name" | "date" | "size";
type SortDirection = "normal" | "inverted";

interface PageUrlParams {
    sort?: SortMode,
    direction?: SortDirection;
}

const API_URL = import.meta.env.VITE_NGINX_AUTOINDEX_URL;

const location = useBrowserLocation();
const parentPath = computed(() => 
        location.value
            .pathname
            ?.replace(/[/]*$/, '')
            .split('/')
            .slice(0, -1)
            .join('/') + '/'
);

const params = useUrlSearchParams<PageUrlParams>();

const sortMode = computed<SortMode>(() => params.sort ?? 'name');
const sortDir = computed<SortDirection>(() => params.direction ?? 'normal');

watch(location, () => {
    document.title = `Index: ${location.value.pathname}`;
}, { immediate: true })

const { isPending, data } = useQuery({
    queryKey: ['files', location],
    enabled: computed(() => !!location.value.pathname),
    queryFn: async (): Promise<Entry[]> => {
        const res = await fetch(`${API_URL}${location.value.pathname}`) 
        const rawEntries = (await res.json()) as RawEntry[];
        return rawEntries.map((entry) => ({
            ...entry,
            link: getLink(entry.name, entry.type),
            time: new Date(entry.mtime),
            isDir: entry.type === 'directory',
        }));
    },
});

const sortedEntries = computed(() => {
    if (!data.value) return [];

    return sortEntries(
        data.value,
        sortMode.value,
        sortDir.value,
    );
});

function toggleSort(mode: SortMode) {
    if (params.sort === mode) {
        params.direction =
            params.direction === 'normal' ? 'inverted' : 'normal';
    } else {
        params.sort = mode;
        params.direction = 'normal';
    }
}

function sortEntries(
    entries: Entry[],
    sortMode: SortMode,
    sortDirection: SortDirection,
): Entry[] {
    const dir = sortDirection === "normal" ? 1 : -1;

    return [...entries].sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;

        if (sortMode === "name") {
            if (a.name < b.name) return -1 * dir;
            if (a.name > b.name) return 1 * dir;
            return 0;
        }

        if (sortMode === "date") {
            const at = a.time.getTime();
            const bt = b.time.getTime();

            if (at < bt) return -1 * dir;
            if (at > bt) return 1 * dir;
            return 0;
        }

        if (sortMode === "size") {
            const as = a.size ?? 0;
            const bs = b.size ?? 0;

            if (as < bs) return -1 * dir;
            if (as > bs) return 1 * dir;
            return 0;
        }

        return 0;
    });
}
function formattedSize(value: number): string {
    let size = value
    for(const unit of ['B', 'KiB', 'MiB', 'GiB', 'TiB']) {
        if (size < 2048)
            return `${size} ${unit}`
        else
            size = Math.floor(size / 1024)
    }
    return `${size} PiB`
}

function getLink(name: string, type: EntryType) {
    if (type === 'file')
        return `${API_URL}${location.value.pathname}/${name}`;
    return name;
}
</script>

<style scoped>
    .page {
        --columns: 3;
        --border: 1px solid #444;

        padding: 32px;
    }
    .entry-list {
        display: grid;
        grid-template-columns: repeat(var(--columns), auto);
        border-top: var(--border);
        border-left: var(--border);
    }
    .entry-box {
        font-size: 0.93rem;
        font-weight: 500;
        border-bottom: var(--border);
        border-right: var(--border);
    }
    .entry-box.nona {
        padding: 4px 8px;
    }
    .entry {
        display: contents;
    }
    .entry.header {
        font-weight: 600;
    }
    .entry a {
        color: var(--accent);
        padding: 4px 8px;
        text-decoration: none;
        display: flex;
        gap: 4px;
        align-items: center;
    }
    .entry a:hover {
        text-decoration: underline;
    }
    .entry a svg {
       height: 14px; 
    }
</style>

<template>
    <div class="page">

        <h2>Directory of {{location.pathname}}</h2>
    <div v-if="isPending">
        Loading...
    </div>

    <div class="entry-list" v-else>
        <div class="entry header">
            <!-- TODO: Pass correct href as well -->
            <div class="entry-box">
                <a href="" @click.prevent="toggleSort('name')">
                    Name
                    <span v-if="params.sort === 'name'">
                        {{ params.direction === 'normal' ? '↑' : '↓' }}
                    </span>
                </a>
            </div>
            <div class="entry-box">
                <a href="" @click.prevent="toggleSort('size')">
                    Size
                    <span v-if="params.sort === 'size'">
                        {{ params.direction === 'normal' ? '↑' : '↓' }}
                    </span>
                </a>
             </div>
            <div class="entry-box">
                <a href="" @click.prevent="toggleSort('date')">
                    Update date
                    <span v-if="params.sort === 'date'">
                        {{ params.direction === 'normal' ? '↑' : '↓' }}
                    </span>
                </a>
             </div>
        </div>

        <div v-if="location.pathname !== '/'" class="entry">
            <div class="entry-box">
                <a :key="parentPath" :href="parentPath"  @click.prevent="location.pathname = parentPath">
                    <CornerLeftUp />
                    ../
                </a>
            </div>
            <div class="entry-box nona"></div>
            <div class="entry-box nona"></div>
        </div>

        <div 
            v-for="entry in sortedEntries"
            :key="entry.name"
            class="entry">

            <div class="entry-box">
                <!-- TODO: Refactor -->
                <a 
                    :href="entry.link + '/'" 
                    @click="if(entry.type === 'directory') { $event.preventDefault(); location.pathname += entry.link + '/'; }">
                    <Folder v-if="entry.isDir" />
                    <File v-else />
                    {{entry.name + (entry.isDir ? '/' : '')}}
                </a>
            </div>
            <div class="entry-box nona">
                <template v-if="entry.type === 'file'">
                    {{formattedSize(entry.size ?? -1)}}
                </template>
            </div>
            <div class="entry-box nona">
                {{entry.time.toISOString()}}
            </div>
        </div>
    </div>
    </div>
</template>
