'use client'

import { useEffect, useState } from 'react'

const IOS = 'https://apps.apple.com/us/app/nimiq-pay/id6471844738'
const ANDROID = 'https://play.google.com/store/apps/details?id=com.nimiq.pay'
const LANDING = 'https://nimpay.app'

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * Soft invite when Connect is tapped outside Nimiq Pay.
 * Tab is a mini-app experience — guide them to download Pay, not a red error.
 */
export function NimiqPayInvite({ open, onClose }: Props) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(open))
    return () => cancelAnimationFrame(id)
  }, [open])

  if (!open) return null

  return (
    <div
      className="pay-invite"
      data-shown={shown ? 'true' : 'false'}
      role="dialog"
      aria-labelledby="pay-invite-title"
      aria-describedby="pay-invite-copy"
    >
      <div className="pay-invite__card">
        <p className="eyebrow">Tab × Nimiq Pay</p>
        <h2 id="pay-invite-title" className="pay-invite__title">
          Tab is a Nimiq Pay experience
        </h2>
        <p id="pay-invite-copy" className="pay-invite__copy">
          Connect, split, and settle live inside the Nimiq Pay mini-app. Grab Pay on your phone,
          open Tab from there, and try a real table split.
        </p>

        <div className="pay-invite__stores">
          <a className="pay-invite__store" href={IOS} target="_blank" rel="noreferrer">
            <span className="pay-invite__store-os">iPhone</span>
            <span className="pay-invite__store-name">App Store</span>
          </a>
          <a className="pay-invite__store" href={ANDROID} target="_blank" rel="noreferrer">
            <span className="pay-invite__store-os">Android</span>
            <span className="pay-invite__store-name">Google Play</span>
          </a>
        </div>

        <a className="pay-invite__more" href={LANDING} target="_blank" rel="noreferrer">
          What is Nimiq Pay?
        </a>

        <button type="button" className="chip-btn chip-btn--ghost pay-invite__dismiss" onClick={onClose}>
          Keep browsing
        </button>
      </div>
    </div>
  )
}
