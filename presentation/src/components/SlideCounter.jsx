export default function SlideCounter({ current, total }) {
  return (
    <div id="slide-counter">
      {current + 1} / {total}
    </div>
  )
}
