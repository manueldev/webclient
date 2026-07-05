<template>
    <div class="classicalwork">
        <WorkHeader :work="work" />

        <div class="workmovements">
            <div v-for="movement in work.movements" :key="movement.movement_title" class="workmovement">
                <TrackItem
                    :track="{ ...movement, title: movement.movement_title }"
                    :is-classical-track="true"
                    @playThis="$emit('playThis', movement.trackhash)"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ClassicalWork } from '@/interfaces'
import WorkHeader from './WorkHeader.vue'
import TrackItem from '../shared/TrackItem.vue'

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
