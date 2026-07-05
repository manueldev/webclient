<template>
    <!-- <QueueActions /> -->
    <PlayingFrom />
    <div class="queue-virtual-scroller" @mouseover="mouseover = true" @mouseout="mouseover = false">
        <NoItems
            :flag="!store.tracklist.length"
            :title="'No songs in queue'"
            :description="'When you start playing songs, they will appear here.'"
            :icon="QueueSvg"
        />
        <DynamicScroller
            id="queue-scrollable"
            ref="scroller"
            class="scroller"
            style="height: 100%"
            :items="scrollerItems"
            :min-item-size="itemHeight"
        >
            <template #default="{ item, index, active }">
                <DynamicScrollerItem
                    :item="item"
                    :active="active"
                    :size-dependencies="[item.props]"
                    :data-index="index"
                >
                    <component
                        :is="item.component"
                        v-bind="item.props"
                        :is-current="index === queue.currentindex"
                        :is-current-playing="index === queue.currentindex && queue.playing"
                        @playThis="playFromQueue(index)"
                    ></component>
                </DynamicScrollerItem>
            </template>
        </DynamicScroller>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import useQStore from '@/stores/queue'
import useInterface from '@/stores/interface'
import useTracklist from '@/stores/queue/tracklist'

import NoItems from '../shared/NoItems.vue'
import QueueActions from './Queue/QueueActions.vue'
import TrackItem from '@/components/shared/TrackItem.vue'
import QueueSvg from '@/assets/icons/queue.svg'
import PlayingFrom from '../NowPlaying/PlayingFrom.vue'

const itemHeight = 64

const queue = useQStore()
const store = useTracklist()
const mouseover = ref(false)
const scroller = ref<any>(null)

const { focusCurrentInSidebar, setScrollFunction } = useInterface()

const scrollerItems = computed(() => {
    return store.tracklist.map((track, index) => ({
        id: index,
        component: TrackItem,
        props: {
            track,
            index,
            isQueueTrack: true,
        },
    }))
})

function playFromQueue(index: number) {
    queue.play(index)
}

const show_above = 1 // the number of tracks to show above the current track

function scrollToCurrent() {
    scroller.value?.scrollToItem(Math.max(queue.currentindex - show_above, 0))
}

onMounted(() => {
    setScrollFunction(scrollToCurrent, mouseover)
    focusCurrentInSidebar()
})

onBeforeUnmount(() => {
    setScrollFunction(() => {}, null)
})
</script>

<style lang="scss">
.queue-virtual-scroller {
    height: 100%;
    overflow: hidden;
}
</style>
