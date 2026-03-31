export default function Slide({ id, active, children }) {
  return (
    <section className={`slide${active ? ' active' : ''}`} id={id}>
      {children}
    </section>
  )
}
