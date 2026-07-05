<template>
    <div class="classicaltrack">
        <div class="classicaltracktitle">
            {{ track.movement_title }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ClassicalMovement } from '@/interfaces'

const props = defineProps<{
    track: ClassicalMovement
}>()
</script>

<style lang="scss">
.classicaltrack {
    display: flex;
    flex-direction: column;
}
</style>