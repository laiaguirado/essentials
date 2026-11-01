const linkGroups = [
  { title: 'Basics Google', icon: '◎', tone: 'google', links: [['⌕', 'Google', 'https://www.google.com'], ['✉', 'Gmail', 'https://mail.google.com'], ['文', 'Traductor', 'https://translate.google.com'], ['▱', 'Drive', 'https://drive.google.com'], ['▧', 'Fotos', 'https://photos.google.com']] },
  { title: 'Media', icon: '▶', tone: 'media', links: [['▶', 'YouTube', 'https://www.youtube.com'], ['N', 'Netflix', 'https://www.netflix.com'], ['▸', 'Amazon Video', 'https://www.primevideo.com'], ['✦', 'Disney+', 'https://www.disneyplus.com'], ['M', 'HBO', 'https://www.max.com']] },
  { title: 'Music', icon: '♫', tone: 'music', links: [['▶', 'YouTube Music', 'https://music.youtube.com'], ['●', 'Spotify', 'https://open.spotify.com'], ['♫', 'Amazon Music', 'https://music.amazon.com']] },
  { title: 'RRSS', icon: '◎', tone: 'social', links: [['◎', 'Instagram', 'https://www.instagram.com'], ['♪', 'TikTok', 'https://www.tiktok.com'], ['◈', 'Twitch', 'https://www.twitch.tv']] },
  { title: 'Programming', icon: '</>', tone: 'code', links: [['◉', 'GitHub', 'https://github.com'], ['✦', 'Figma', 'https://figma.com'], ['N', 'Notion', 'https://www.notion.so']] },
  { title: 'Travels', icon: '✈', tone: 'travel', links: [['⌂', 'Booking', 'https://www.booking.com'], ['✈', 'Vueling', 'https://www.vueling.com'], ['✈', 'Ryanair', 'https://www.ryanair.com'], ['⌕', 'Skyscanner', 'https://www.skyscanner.com']] },
]

function Links() {
  return <section className="dashboard-card links-card" id="links">
    <div className="section-heading"><div><span className="card-kicker">Workspace</span><h2>Links</h2><p className="section-description">Todos tus accesos habituales, ordenados por categoría.</p></div><span className="section-caption">{linkGroups.reduce((total, group) => total + group.links.length, 0)} enlaces</span></div>
    <div className="link-category-grid">{linkGroups.map(group => <article className={`link-category link-${group.tone}`} key={group.title}><div className="link-category-heading"><span className="category-icon">{group.icon}</span><div><h3>{group.title}</h3><small>{group.links.length} accesos</small></div></div><div className="link-list">{group.links.map(([icon, label, url]) => <a href={url} target="_blank" rel="noreferrer" key={label}><span className="link-service-icon">{icon}</span><span>{label}</span><span className="link-external">↗</span></a>)}</div></article>)}</div>
  </section>
}

export default Links
