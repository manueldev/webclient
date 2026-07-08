import { getBaseUrl, paths } from '@/config'
import { Album, ClassicalMovement, Track } from '@/interfaces'
import { getAlbumTracks, normalizeAlbumTracks } from '@/requests/album'
import useSettings from '@/stores/settings'
import { NotifType, useToast } from '@/stores/notification'

/**
 * Builds the exact same URL the audio player uses (see getUrl in stores/player.ts),
 * forcing the legacy streaming endpoint. The browser's <audio> element appends a
 * Range header automatically, which causes the server to return a 206 Partial
 * Content response. For downloads we want the full file, so we use `fetch()`
 * (which does not send Range by default) and never set the Range header.
 */
function buildDownloadUrl(trackhash: string, filepath: string): string {
    const { streaming_container, streaming_quality } = useSettings()
    const url =
        `${paths.api.files}/${trackhash}/legacy` +
        `?filepath=${encodeURIComponent(filepath)}` +
        `&container=${streaming_container}` +
        `&quality=${streaming_quality}`

    return getBaseUrl() + url
}

function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]+/g, '_').trim()
}

function buildFilename(track: Track | ClassicalMovement): string {
    const artist = track.artists?.[0]?.name ?? 'Unknown Artist'

    // The actual file we download is encoded in `streaming_container` (see
    // buildDownloadUrl). Using the track's original filetype would be
    // misleading — e.g. a FLAC source transcoded to MP3 would be saved with
    // a `.flac` extension while its bytes are MP3.
    const { streaming_container } = useSettings()
    const ext = (streaming_container || track.filetype || 'mp3').replace(/^\./, '')

    return sanitizeFilename(`${track.title} - ${artist}.${ext}`)
}

/**
 * Parses RFC 5987 / RFC 6266 Content-Disposition header to extract the
 * filename. Browsers send different formats:
 *   - attachment; filename="track.mp3"
 *   - attachment; filename*=UTF-8''track%20name.mp3
 */
function parseContentDisposition(header: string | null): string | null {
    if (!header) return null

    // Try the RFC 5987 `filename*=UTF-8''...` form first
    const extMatch = header.match(/filename\*\s*=\s*[^']*''([^;]+)/i)
    if (extMatch) {
        try {
            return decodeURIComponent(extMatch[1].trim().replace(/^"|"$/g, ''))
        } catch {
            // fall through to plain filename
        }
    }

    // Fallback to plain `filename="..."`
    const plainMatch = header.match(/filename\s*=\s*"?([^";]+)"?/i)
    if (plainMatch) {
        return plainMatch[1].trim()
    }

    return null
}

function triggerBrowserDownload(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

async function fetchAsBlob(url: string): Promise<Blob> {
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    return response.blob()
}

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Downloads a single track file using the same endpoint the player uses,
 * but without sending any Range header so the server returns the full body.
 *
 * The filename is taken from the server's `Content-Disposition` header when
 * available (the authoritative source). Falls back to building a name from
 * track metadata + the requested streaming container.
 */
export async function downloadTrack(track: Track | ClassicalMovement): Promise<void> {
    const toast = useToast()
    try {
        await fetchAndDownload(track)
    } catch (err) {
        console.error('downloadTrack failed:', err)
        toast.showNotification(`Failed to download "${track.title}"`, NotifType.Error)
    }
}

/**
 * Fetches a single track and triggers a download using the server-provided
 * filename (from Content-Disposition) when available, falling back to a
 * filename built from the track metadata.
 *
 * Shared between `downloadTrack` (single) and `downloadAlbum` (sequential) so
 * both paths apply the same extension-correction logic.
 */
async function fetchAndDownload(
    track: Track | ClassicalMovement,
): Promise<void> {
    const toast = useToast()
    const url = buildDownloadUrl(track.trackhash, track.filepath)

    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()
    const serverFilename = parseContentDisposition(response.headers.get('content-disposition'))
    const filename = serverFilename ?? buildFilename(track)

    triggerBrowserDownload(blob, filename)
    toast.showNotification(`Downloading "${track.title}"`, NotifType.Success)
}

/**
 * Downloads every track of an album sequentially, using the same endpoint as
 * the audio player and intentionally omitting Range headers.
 *
 * Tracks are queued one at a time with a small delay between them so the
 * browser has time to start each download before the next request is issued.
 */
export async function downloadAlbum(album: Album, tracks?: Track[]): Promise<void> {
    const toast = useToast()

    try {
        let resolvedTracks: Track[]

        if (tracks && tracks.length) {
            resolvedTracks = tracks
        } else {
            ;({ tracks: resolvedTracks } = normalizeAlbumTracks(await getAlbumTracks(album.albumhash)))
        }

        if (!resolvedTracks.length) {
            toast.showNotification(`No tracks to download for "${album.title}"`, NotifType.Info)
            return
        }

        const total = resolvedTracks.length
        toast.showNotification(`Starting download of ${total} track(s) from "${album.title}"`, NotifType.Info)

        for (let i = 0; i < resolvedTracks.length; i++) {
            const track = resolvedTracks[i]
            try {
                await fetchAndDownload(track)
            } catch (err) {
                console.error(`downloadAlbum track failed (${track.title}):`, err)
                toast.showNotification(
                    `Failed to download track ${i + 1}/${total}: "${track.title}"`,
                    NotifType.Error
                )
            }

            // Yield to the browser so the download can start before we issue
            // the next request. Skipped after the last track.
            if (i < resolvedTracks.length - 1) {
                await delay(250)
            }
        }

        toast.showNotification(`Finished downloading "${album.title}"`, NotifType.Success)
    } catch (err) {
        console.error('downloadAlbum failed:', err)
        toast.showNotification(`Failed to download album "${album.title}"`, NotifType.Error)
    }
}
