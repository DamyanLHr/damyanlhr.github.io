import { describe, expect, it } from 'vitest'
import { content } from '../content'
import { brandOf } from './social-brand'

describe('brandOf', () => {
  it('gives every profile link a mark, so none shows up as bare text', () => {
    for (const link of content.profile.socials) expect(brandOf(link), link.label).not.toBeNull()
  })

  it('knows LinkedIn before it is added', () => {
    expect(brandOf({ label: 'LinkedIn', url: 'https://www.linkedin.com/in/someone' })).toBe(
      'linkedin',
    )
  })

  it('leaves an unknown link to its text', () => {
    expect(brandOf({ label: 'Blog', url: 'https://example.com' })).toBeNull()
  })
})
