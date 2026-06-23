<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useBrowserLocation } from '@vueuse/core';
import { computed } from 'vue';
import { File, Folder, CornerLeftUp } from '@lucide/vue';

type EntryType = 'directory' | 'file';

interface Entry {
    name: string;
    type: EntryType;
    time: Date;
    size?: number;
    link: string;
    isDir: boolean;
}

const location = useBrowserLocation();
const parentPath = computed(() => 
        location.value
            .pathname
            ?.replace(/[/]*$/, '')
            .split('/')
            .slice(0, -1)
            .join('/') + '/'
);

const { isPending, data } = useQuery({
    queryKey: ['files', location],
    queryFn: async (): Promise<Entry[]> => {
        const res = await fetch(`https://files.kotle.uk/api${location.value.pathname}`) 
        const entries = await res.json();
        return entries.map((entry) => ({
            ...entry,
            link: getLink(entry),
            time: new Date(entry.mtime),
            isDir: entry.type === 'directory',
        }));
    },
});

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

function getLink(entry: Entry) {
    if (entry.type === 'file')
        return `https://files.kotle.uk/api${location.value.pathname}/${entry.name}`;
    return entry.name;
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
            v-for="entry in data"
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
                    {{formattedSize(entry.size)}}
                </template>
            </div>
            <div class="entry-box nona">
                {{entry.time.toISOString()}}
            </div>
        </div>
    </div>
    </div>
</template>
