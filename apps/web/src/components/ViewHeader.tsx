export function ViewHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.015em' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(232,234,240,0.5)', marginTop: 3 }}>{subtitle}</div>
    </div>
  )
}
