export default function Footer({ delay = 1.8 }) {
  return (
    <div
      className="s-footer-abs"
      style={{ opacity: 0, animation: `fade-in 0.8s ease forwards ${delay}s` }}
    >
    </div>
  )
}
