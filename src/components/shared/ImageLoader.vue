<template>
    <div
        ref="imageLoader"
        class="image-loader"
        :style="{
            height: `${Math.max(imageHeights[images[0]?.key] || 0, containerWidth || 0)}px`,
        }"
    >
        <canvas
            v-if="props.blurhash"
            ref="blurhashCanvas"
            class="blurhash-placeholder rounded-sm"
            :class="{ 'fade-out': imageLoaded }"
            :style="{
                transitionDuration: `${duration}ms`,
                height: `${Math.max(imageHeights[images[0]?.key] || 0, containerWidth || 0)}px`,
            }"
        ></canvas>
        <img
            v-for="(img, index) in images"
            :key="img.key"
            :ref="el => setImageRef(img.key, el)"
            :src="img.src"
            :class="`${index === activeIndex && readyToShowKeys.has(img.key) ? 'active' : ''} il-image ${
                imgClass || ''
            }`"
            :style="{
                transition: `opacity ${duration}ms ease-in-out, object-position 0.3s ease`,
                objectPosition: imagePositions[img.key],
            }"
            @load="onDomImageLoad(img.key, $event)"
        />
        <template v-if="showPanelButtons">
            <button class="panel-btn prev" aria-label="Previous cover panel" @click.stop.prevent="stepPanel(-1)">
                <RightArrowSvg />
            </button>
            <button class="panel-btn next" aria-label="Next cover panel" @click.stop.prevent="stepPanel(1)">
                <RightArrowSvg />
            </button>
        </template>
    </div>
</template>

<script setup lang="ts">
import { decode } from 'blurhash'
import { computed, ref, watch, nextTick, onMounted } from 'vue'

import RightArrowSvg from '@/assets/icons/right-arrow.svg'

const props = defineProps<{
    image: string
    duration: number
    blurhash?: string
    imgClass?: string
    panels?: boolean
}>()

const MAX_PANELS = 4
const PANEL_RATIO_TOLERANCE = 0.12

const imageKey = ref(0)
const activeIndex = ref(0)
const imageLoaded = ref(false)
const readyToShowKeys = ref<Set<number>>(new Set())
const imageHeights = ref<Record<number, number>>({})
const imageLoader = ref<HTMLDivElement | null>(null)
const blurhashCanvas = ref<HTMLCanvasElement | null>(null)
const images = ref<Array<{ src: string; key: number }>>([])
const imageRefs = ref<Record<number, HTMLImageElement | null>>({})
const containerWidth = computed(() => imageLoader.value?.clientWidth)

const panelCount = ref(1)
const panelAxis = ref<'x' | 'y'>('x')
const panelIndex = ref(0)
const imagePositions = ref<Record<number, string>>({})
const canHover = window.matchMedia('(hover: hover)').matches

const showPanelButtons = computed(() => !!props.panels && canHover && panelCount.value > 1)

const panelPosition = computed(() => {
    if (panelCount.value < 2) return ''

    // panel i of n sits at i/(n-1) * 100% along the long axis,
    // as if the scan were folded n times
    const pct = (panelIndex.value / (panelCount.value - 1)) * 100
    return panelAxis.value === 'x' ? `${pct}% 0%` : `0% ${pct}%`
})

watch(panelPosition, position => {
    const active = images.value[images.value.length - 1]
    if (active && position) {
        imagePositions.value[active.key] = position
    }
})

function detectPanels(img: HTMLImageElement) {
    if (!props.panels || !img.naturalWidth || !img.naturalHeight) return

    const ratio = Math.max(img.naturalWidth, img.naturalHeight) / Math.min(img.naturalWidth, img.naturalHeight)
    const n = Math.round(ratio)

    if (n >= 2 && n <= MAX_PANELS && Math.abs(ratio / n - 1) <= PANEL_RATIO_TOLERANCE) {
        panelCount.value = n
        panelAxis.value = img.naturalWidth > img.naturalHeight ? 'x' : 'y'
    }
}

function stepPanel(dir: number) {
    panelIndex.value = (panelIndex.value + dir + panelCount.value) % panelCount.value
}

watch(
    () => props.image,
    async newImage => {
        if (!newImage) return
        renderBlurhash()

        imageLoaded.value = false
        readyToShowKeys.value.clear()

        panelCount.value = 1
        panelIndex.value = 0

        const imageKeyValue = imageKey.value++
        const newImageObj = {
            src: newImage,
            key: imageKeyValue,
        }

        images.value.push(newImageObj)

        if (images.value.length > 2) {
            const removedImage = images.value.shift()
            if (removedImage) {
                delete imageRefs.value[removedImage.key]
                delete imagePositions.value[removedImage.key]
                readyToShowKeys.value.delete(removedImage.key)
            }
        }

        setTimeout(() => {
            activeIndex.value = images.value.length - 1
        }, 10)

        await loadImageManually(newImage, imageKeyValue)
    },
    { immediate: true }
)

function renderBlurhash() {
    if (!props.blurhash || !blurhashCanvas.value || !containerWidth.value) return

    const canvas = blurhashCanvas.value
    const width = containerWidth.value
    const height = imageHeights.value[images.value[0]?.key] || width

    canvas.width = width
    canvas.height = height

    try {
        const pixels = decode(props.blurhash, width, height)
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const imageData = ctx.createImageData(width, height)
        imageData.data.set(pixels)
        ctx.putImageData(imageData, 0, 0)
    } catch (error) {
        console.error('Failed to decode blurhash:', error)
    }
}

function setImageRef(key: number, el: unknown) {
    if (el && el instanceof HTMLImageElement) {
        imageRefs.value[key] = el
    } else {
        imageRefs.value[key] = null
    }
}

function onDomImageLoad(imageKeyValue: number, eventOrElement: Event | HTMLImageElement) {
    if (readyToShowKeys.value.has(imageKeyValue)) return

    const imgElement = eventOrElement instanceof Event ? (eventOrElement.target as HTMLImageElement) : eventOrElement

    if (!imgElement || !imageLoader.value) return

    if (imgElement.complete && imgElement.naturalHeight > 0) {
        const minHeight = Math.min(imageLoader.value?.clientWidth || 0, imgElement.naturalHeight)
        imageHeights.value = { ...imageHeights.value, [imageKeyValue]: minHeight }

        if (images.value[images.value.length - 1]?.key === imageKeyValue) {
            detectPanels(imgElement)
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                readyToShowKeys.value.add(imageKeyValue)
                imageLoaded.value = true
            })
        })
    }
}

async function loadImageManually(imageSrc: string, imageKeyValue: number) {
    try {
        const response = await fetch(imageSrc)
        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`)
        }

        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)

        await nextTick()

        const imageIndex = images.value.findIndex(img => img.key === imageKeyValue)
        if (imageIndex !== -1) {
            const imgElement = imageRefs.value[imageKeyValue]
            if (imgElement) {
                if (imgElement.complete && imgElement.naturalHeight > 0) {
                    onDomImageLoad(imageKeyValue, imgElement)
                }
            }
            images.value[imageIndex].src = imageUrl
        }
    } catch (error) {
        console.error('Error loading image:', error)
        await nextTick()
        const imageIndex = images.value.findIndex(img => img.key === imageKeyValue)
        if (imageIndex !== -1) {
            const imgElement = imageRefs.value[imageKeyValue]
            if (imgElement) {
                if (imgElement.complete && imgElement.naturalHeight > 0) {
                    onDomImageLoad(imageKeyValue, imgElement)
                }
            }
            images.value[imageIndex].src = imageSrc
        }
    }
}

watch(
    () => activeIndex.value,
    () => {
        if (images.value.length > 1 && activeIndex.value === images.value.length - 1) {
            setTimeout(() => {
                images.value = images.value.slice(-1)
                activeIndex.value = 0
            }, props.duration)
        }
    }
)

onMounted(() => {
    renderBlurhash()
})
</script>

<style lang="scss">
.image-loader {
    position: relative;
    width: 100%;
    height: 100%;

    .blurhash-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 1;
        transition: opacity ease-in-out;
        z-index: 0;

        &.fade-out {
            opacity: 0;
        }
    }

    .il-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top left;
        opacity: 0;
        transition: opacity ease-in-out;
        z-index: 1;

        &.active {
            opacity: 1;
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
        z-index: 2;

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
</style>
