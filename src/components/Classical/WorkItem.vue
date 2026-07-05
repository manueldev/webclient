<template>
    <div class="classicalwork">
        <WorkHeader :work="work" />

        <div class="workmovements">
            <div v-for="movement in work.movements" :key="movement.movement_title" class="workmovement">
                <TrackItem
                    :track="{ ...movement, title: movement.movement_title }"
                    :is-queue-track="$route.name === Routes.nowPlaying"
                    :is-classical-track="true"
                    :is-current="queue.currenttrack?.trackhash === movement.trackhash"
                    :is-current-playing="queue.currenttrack?.trackhash === movement.trackhash && queue.playing"
                    @playThis="$emit('playThis', movement.trackhash)"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Routes } from '@/router'
import WorkHeader from './WorkHeader.vue'
import { ClassicalWork } from '@/interfaces'
import TrackItem from '../shared/TrackItem.vue'
import useQueueStore from '@/stores/queue'

const queue = useQueueStore()

defineProps<{
    work: ClassicalWork
}>()

defineEmits<{
    // eslint-disable-next-line no-unused-vars
    (event: 'playThis', trackhash: string): void
}>()
</script>

<style lang="scss">
.classicalwork {
    display: flex;
    flex-direction: column;
    // top spacing comes from WorkHeader
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
