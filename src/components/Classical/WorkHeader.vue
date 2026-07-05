<template>
    <div class="workheader">
        <div class="workcomposer">
            {{ work.composer }}
        </div>
        <div class="worktitle">
            {{ title }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QueueWork } from '@/interfaces'

const props = defineProps<{
    work: QueueWork
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
    padding-top: 2rem;
}

.worktitle {
    font-size: 1rem;
    font-weight: 600;
}

.workcomposer {
    font-size: 12px;
    color: $gray1;
    text-transform: uppercase;
}
</style>
