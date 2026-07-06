<template>
    <div class="workheader">
        <div class="workcomposer">
            <span v-if="work.composer" class="composername">{{ work.composer }}</span>
            <span v-if="playable" class="play" @click.stop="$emit('playWork')"> <PlaySvg /> Play</span>
        </div>
        <div class="worktitle">
            {{ title }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QueueWork } from '@/interfaces'
import PlaySvg from '@/assets/icons/play.svg'

const props = defineProps<{
    work: QueueWork
    playable?: boolean
}>()

defineEmits<{
    (e: 'playWork'): void
}>()

const title = computed(() => {
    let title = props.work.name

    const catalogueIds = (props.work.catalogue_ids ?? []).map(id => id.name).join(', ')
    if (catalogueIds) {
        title += ', ' + catalogueIds
    }

    if (props.work.subtitle) {
        title += ' · ' + `"${props.work.subtitle}"`
    }

    return title
})
</script>

<style lang="scss">
.workheader {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: $small;
    // separates this work from whatever sits above it (previous work or tracks)
    padding-top: 1.25rem;
    padding-bottom: $smaller;
}

.worktitle {
    font-size: 1rem;
    font-weight: 600;
}

.workcomposer {
    font-size: 12px;
    color: $gray1;
    text-transform: uppercase;
    display: flex;
    align-items: center;

    .composername {
        margin-right: $smaller;
    }

    .play {
        opacity: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: opacity 0.2s ease-out;

        svg {
            height: 12px;
        }
    }

    .play {
        text-transform: none;
    }
}

.workheader:hover .workcomposer .play {
    opacity: 1;
}
</style>
