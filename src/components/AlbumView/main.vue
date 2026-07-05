<template>
    <div
        class="album-header-ambient rounded-lg"
        style="height: 100%; width: 100%"
        :style="{
            boxShadow:
                // hide shadow on small screen
                isSmallPhone ? '' : colors.bg ? `0 .5rem 2rem ${colors.bg}` : '0 .5rem 2rem black',
        }"
    ></div>
    <div
        ref="albumheaderthing"
        class="a-header rounded-lg"
        :style="{
            // hide background on small screen
            background: isSmallPhone ? '' : colors.bg ? colors.bg : '',
        }"
    >
        <div class="big-img no-scroll" :class="`${isHeaderSmall ? 'imgSmall' : ''} shadow-lg rounded-sm`">
            <img
                ref="coverImg"
                :src="imguri.thumb.large + album.image"
                class="rounded-sm"
                :class="{ 'multi-panel': panelCount > 1 }"
                :style="{ objectPosition: panelPosition }"
                @load="detectPanels"
            />
            <template v-if="showPanelButtons">
                <button class="panel-btn prev" aria-label="Previous cover panel" @click="stepPanel(-1)">
                    <RightArrowSvg />
                </button>
                <button class="panel-btn next" aria-label="Next cover panel" @click="stepPanel(1)">
                    <RightArrowSvg />
                </button>
            </template>
        </div>
        <Info />
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

import { paths } from '@/config'
import { isHeaderSmall, isSmallPhone } from '@/stores/content-width'

import useNavStore from '@/stores/nav'
import useAlbumStore from '@/stores/pages/album'

import RightArrowSvg from '@/assets/icons/right-arrow.svg'
import Info from '@/components/AlbumView/Header/Info.vue'
import useVisibility from '@/utils/useVisibility'

const albumheaderthing = ref<any>(null)
const imguri = paths.images

const nav = useNavStore()
const store = useAlbumStore()

const { info: album, colors } = storeToRefs(store)

// laid out side by side or stacked, e.g. 512x255. Detect them from the aspect ratio
// and let the user flip between panels.
const MAX_PANELS = 4
const PANEL_RATIO_TOLERANCE = 0.12

const coverImg = ref<HTMLImageElement | null>(null)
const panelCount = ref(1)
const panelAxis = ref<'x' | 'y'>('x')
const panelIndex = ref(0)

// hover-only controls: touch devices keep the default top-left crop
const canHover = window.matchMedia('(hover: hover)').matches

function detectPanels() {
    panelCount.value = 1
    panelIndex.value = 0

    const img = coverImg.value
    if (!img || !img.naturalWidth || !img.naturalHeight) return

    const { naturalWidth: w, naturalHeight: h } = img
    const ratio = Math.max(w, h) / Math.min(w, h)
    const n = Math.round(ratio)

    if (n >= 2 && n <= MAX_PANELS && Math.abs(ratio / n - 1) <= PANEL_RATIO_TOLERANCE) {
        panelCount.value = n
        panelAxis.value = w > h ? 'x' : 'y'
    }
}

const panelPosition = computed(() => {
    if (panelCount.value < 2) return 'top left'

    // panel i of n lines up at i/(n-1) * 100% along the long axis,
    // as if the scan were folded n times
    const pct = (panelIndex.value / (panelCount.value - 1)) * 100
    return panelAxis.value === 'x' ? `${pct}% 0%` : `0% ${pct}%`
})

const showPanelButtons = computed(() => canHover && panelCount.value > 1)

function stepPanel(dir: number) {
    panelIndex.value = (panelIndex.value + dir + panelCount.value) % panelCount.value
}

// reset while the next album's image loads so a stale panel crop never shows
watch(
    () => album.value.image,
    () => {
        panelCount.value = 1
        panelIndex.value = 0
    }
)

onMounted(() => {
    // cached images can finish loading before the load listener is attached
    if (coverImg.value?.complete) detectPanels()
})

defineEmits<{
    // eslint-disable-next-line no-unused-vars
    (event: 'playThis'): void
}>()

function handleVisibilityState(state: boolean) {
    nav.toggleShowPlay(state)
}

useVisibility(albumheaderthing, handleVisibilityState)
</script>

<style lang="scss">
.balance-text-temp {
    visibility: hidden;
    position: absolute;
    top: -9999px;
    left: -9999px;
}

.album-header-ambient {
    width: 20rem;
    position: absolute;
    z-index: -100 !important;
    opacity: 0.25;
}

.a-header {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 1rem;
    padding: 1rem;
    height: $banner-height;
    // background-color: $black;
    align-items: flex-end;

    .big-img {
        height: 16rem;
        display: flex;
        align-items: flex-end;
        position: relative;

        img {
            height: 16rem;
            max-width: 16rem;
            object-fit: cover;
            object-position: top left;
            transition: object-position 0.3s ease;

            // vertical panel scans render at intrinsic width otherwise,
            // which shows the full strip instead of cropping to one panel
            &.multi-panel {
                aspect-ratio: 1;
            }
        }

        .panel-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 2rem;
            width: 2rem;
            padding: 0;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            opacity: 0;
            transition: opacity 0.2s ease;

            svg {
                height: 1.5rem;
                width: 1.5rem;
            }

            &.prev {
                left: $small;

                svg {
                    transform: rotate(180deg);
                }
            }

            &.next {
                right: $small;
            }

            &:focus-visible {
                opacity: 1;
            }
        }

        &:hover .panel-btn {
            opacity: 1;
            transition-delay: 0.25s;
        }
    }

    .big-img.imgSmall {
        width: 12rem;
        height: 12rem;

        img {
            height: 12rem;
        }
    }

    .nocontrast {
        color: $black;

        .top {
            .albumtype {
                color: $pink;
            }
        }
    }

    @include largePhones {
        grid-template-columns: 1fr;
        padding: 2rem 1rem;
        height: 25rem;

        .big-img {
            width: 14rem !important;
            height: 14rem !important;
            aspect-ratio: 1;
            margin: 0 auto;

            img {
                height: 14rem !important;
            }
        }

        .albumtype {
            text-align: center;
        }

        .title {
            font-size: 1.5rem !important;
            max-width: fit-content;
            margin: 0 auto;
            text-align: center;
        }

        .album-buttons {
            justify-content: center;
        }

        .album-stats > div {
            border: none;
            margin: $small auto;
        }

        .versions {
            margin-bottom: 0 !important;
            margin-left: 0 !important;
            text-align: center;
        }
    }
}
</style>
