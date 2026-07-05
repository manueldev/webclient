<template>
    <div class="classicalwork">
        <div class="workheader">
            <div class="workcomposer">
                {{ work.composer }}
            </div>
            <div class="worktitle">
                {{ getWorkTitle() }}

            </div>
        </div>

        <div class="workmovements">
            <div v-for="movement in work.movements" :key="movement.movement_title" class="workmovement">
                <!-- <ClassicalTrack :track="movement" /> -->
                <!-- <SongItem :track="{ ...movement, title: movement.movement_title }" :index="1" :hide_album="true" /> -->
                <TrackItem :track="{ ...movement, title: movement.movement_title }" :is-classical-track="true" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ClassicalWork } from '@/interfaces'
import ClassicalTrack from './Track.vue'
import TrackItem from '../shared/TrackItem.vue';
import SongItem from '../shared/SongItem.vue';

const props = defineProps<{
    work: ClassicalWork
}>()

const getWorkTitle = () => {
    let title = props.work.name

    const catalogueIds = (props.work.catalogue_ids ?? []).map(id => id.name).join(', ')
    if (catalogueIds) {
        title += ', ' + catalogueIds
    }

    if (props.work.subtitle) {
        title += ' · ' + `"${props.work.subtitle}"`
    }

    return title
}
</script>

<style lang="scss">
.classicalwork {
    display: flex;
    flex-direction: column;
    padding-top: 2rem;
}

.workheader {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: $small;
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

.workmovements {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-top: $smaller;
}

.workmovement {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.workmovementtitle {
    font-size: 0.9rem;
    font-weight: 600;
}
</style>