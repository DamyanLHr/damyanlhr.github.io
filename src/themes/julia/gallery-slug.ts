import { useEffect, useState } from 'react'
import type { PlateEffect } from '../../content/types'
import { EFFECT_INFO, GALLERY } from './effects/registry'

/**
 * The julia theme's effects gallery lives at /projects/gallery. It is a page
 * of this theme only; no project may take the slug (content tests hold it).
 */
export const GALLERY_SLUG = 'gallery'

/** The gallery's chosen effect, from the address: /projects/gallery#coral. */
export function galleryEffect(): PlateEffect {
  const id = window.location.hash.slice(1)
  return id in EFFECT_INFO ? (id as PlateEffect) : GALLERY[0]
}

/** Picks an effect without stacking a history entry per tile. */
export function chooseEffect(id: PlateEffect) {
  history.replaceState(history.state, '', `#${id}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** The address's hash, kept current. */
export function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}
