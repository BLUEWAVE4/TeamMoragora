import Slide from '../Slide'
import Footer from '../Footer'

export default function PlaceholderSlide({ id, active, pageNum, title, cssImport }) {
  return (
    <Slide id={id} active={active}>
      <div className="s-wrap">
        <div className="header">
          <span className="page-num">{pageNum}</span>
          <span className="header-title">{title}</span>
        </div>
        <div className="placeholder">{title} 콘텐츠 예정</div>
        <Footer />
      </div>
    </Slide>
  )
}
