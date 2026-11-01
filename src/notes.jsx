import { useState } from 'react'
import { useUserData } from './auth/useUserData.js'

function Notes() {
  const [notes, setNotes] = useUserData('notes', [])
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showNewNote, setShowNewNote] = useState(false)

  const saveNewNote = event => {
    event.preventDefault()
    if (!newTitle.trim() && !newContent.trim()) return
    const note = { id: Date.now(), title: newTitle.trim() || 'Nota sin título', content: newContent.trim(), updatedAt: new Date().toISOString() }
    setNotes(current => [note, ...current])
    setSelectedId(note.id)
    setNewTitle('')
    setNewContent('')
    setShowNewNote(false)
  }

  const startEditing = note => {
    setSelectedId(note.id)
    setEditingId(note.id)
    setEditingTitle(note.title)
    setEditingContent(note.content)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle('')
    setEditingContent('')
  }

  const saveEditedNote = event => {
    event.preventDefault()
    if (!editingId || (!editingTitle.trim() && !editingContent.trim())) return
    setNotes(current => current.map(note => note.id === editingId
      ? { ...note, title: editingTitle.trim() || 'Nota sin título', content: editingContent.trim(), updatedAt: new Date().toISOString() }
      : note))
    cancelEditing()
  }

  const deleteNote = id => {
    setNotes(current => current.filter(note => note.id !== id))
    if (selectedId === id) setSelectedId(null)
    if (editingId === id) cancelEditing()
  }

  const selectedNote = notes.find(note => note.id === selectedId)

  return <section className="notes-page">
    <header className="dashboard-header inner-page-header">
      <div><h1>Notas</h1><p className="header-subtitle">Guarda ideas, apuntes y cualquier cosa que quieras recordar.</p></div>
    </header>

    <section className={`notes-create-panel${showNewNote ? ' is-open' : ''}`} aria-label="Añadir una nota">
      <button className="notes-create-toggle" type="button" onClick={() => setShowNewNote(value => !value)} aria-expanded={showNewNote}>{showNewNote ? 'Cerrar nueva nota' : '+ Nueva nota'}</button>
      {showNewNote && <form className="dashboard-card notes-editor" onSubmit={saveNewNote}>
      <div className="notes-editor-heading"><div><span className="card-kicker">Nueva nota</span><h2>Escribe lo que necesites</h2></div></div>
      <input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Título de la nota" aria-label="Título de la nota" />
      <textarea value={newContent} onChange={event => setNewContent(event.target.value)} placeholder="Empieza a escribir..." rows="5" aria-label="Contenido de la nota" />
      <button className="notes-save" type="submit">Guardar nota</button>
      </form>}
    </section>

    <section className={`notes-list-section${selectedNote ? ' is-hidden' : ''}`} aria-label="Mis notas">
      <div className="notes-section-heading"><div><span className="card-kicker">Tu colección</span><h2>Notas creadas</h2></div><span className="section-caption">{notes.length} {notes.length === 1 ? 'nota' : 'notas'}</span></div>
      {notes.length ? <div className="notes-list">{notes.map(note => <article className={`dashboard-card note-card${selectedId === note.id ? ' is-selected' : ''}`} key={note.id} onClick={() => setSelectedId(note.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(note.id) }} role="button" tabIndex="0">
        {editingId === note.id ? <form className="note-inline-editor" onSubmit={saveEditedNote} onClick={event => event.stopPropagation()}><input value={editingTitle} onChange={event => setEditingTitle(event.target.value)} aria-label="Editar título" /><textarea value={editingContent} onChange={event => setEditingContent(event.target.value)} rows="5" aria-label="Editar contenido" /><div className="note-actions"><button className="note-save-edit" type="submit">Guardar</button><button type="button" onClick={cancelEditing}>Cancelar</button></div></form> : <><div className="note-card-heading"><div><span className="note-pin">✦</span><h2>{note.title}</h2></div><small>{new Date(note.updatedAt).toLocaleDateString('es-ES')}</small></div><p>{note.content || 'Sin contenido adicional.'}</p><div className="note-actions"><button type="button" onClick={event => { event.stopPropagation(); startEditing(note) }}>Editar</button><button type="button" onClick={event => { event.stopPropagation(); deleteNote(note.id) }}>Eliminar</button></div></>}
      </article>)}</div> : <div className="dashboard-card notes-empty"><span>✦</span><p>Aún no tienes notas. Crea la primera arriba.</p></div>}
    </section>

    {selectedNote && editingId !== selectedNote.id && <article className="dashboard-card note-detail"><div className="note-detail-heading"><div><span className="card-kicker">Vista completa</span><h2>{selectedNote.title}</h2></div><div className="note-detail-actions"><button className="note-back-list" type="button" onClick={() => setSelectedId(null)}>Volver a la lista</button><button type="button" onClick={() => setSelectedId(null)} aria-label="Cerrar detalle">×</button></div></div><small>{new Date(selectedNote.updatedAt).toLocaleDateString('es-ES')}</small><p>{selectedNote.content || 'Sin contenido adicional.'}</p><button className="note-detail-edit" type="button" onClick={() => startEditing(selectedNote)}>Editar nota</button></article>}
    {selectedNote && editingId === selectedNote.id && <article className="dashboard-card note-detail"><div className="note-detail-heading"><div><span className="card-kicker">Editar nota</span><h2>Actualiza tu nota</h2></div><div className="note-detail-actions"><button className="note-back-list" type="button" onClick={() => { cancelEditing(); setSelectedId(null) }}>Volver a la lista</button><button type="button" onClick={() => { cancelEditing(); setSelectedId(null) }} aria-label="Cerrar edición">×</button></div></div><form className="note-inline-editor note-detail-editor" onSubmit={saveEditedNote}><input value={editingTitle} onChange={event => setEditingTitle(event.target.value)} aria-label="Editar título" /><textarea value={editingContent} onChange={event => setEditingContent(event.target.value)} rows="7" aria-label="Editar contenido" /><div className="note-actions"><button className="note-save-edit" type="submit">Guardar cambios</button><button type="button" onClick={cancelEditing}>Cancelar</button></div></form></article>}
  </section>
}

export default Notes
