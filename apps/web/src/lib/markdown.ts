const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const inline = (s: string) =>
  escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')

/**
 * A tiny, dependency-free Markdown → HTML renderer covering the subset the Docs
 * editor needs: headings, bold/italic/code, unordered lists, and paragraphs.
 * Input is escaped first, so rendering the user's own docs is safe.
 */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let list: string[] | null = null

  const flushList = () => {
    if (list) {
      out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      const level = heading[1]?.length ?? 1
      out.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`)
    } else if (bullet) {
      list ??= []
      list.push(bullet[1] ?? '')
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      out.push(`<p>${inline(line)}</p>`)
    }
  }
  flushList()
  return out.join('\n')
}
