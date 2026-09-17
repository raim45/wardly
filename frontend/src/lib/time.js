/**
 * Timestamp formatting, shared so the banner and the audit log render the same
 * instant the same way.
 *
 * Built explicitly rather than via toLocaleString, because the default is
 * locale-dependent: it renders "Sep 17, 2026, 01:29:17 AM" in en-US and
 * "17/09/2026, 01:29:17" in en-GB. A clinical log should read the same on
 * every machine, and 24-hour time suits it better than AM/PM.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (value) => String(value).padStart(2, '0')

export function formatTimestamp(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return (
    `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
