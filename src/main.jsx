import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
  closestCorners, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Activity, AlignLeft, Bell, CalendarDays, Check, CheckCheck, ChevronDown,
  CircleHelp, Clock3, Command, Filter, LayoutGrid, ListTodo, LogOut, Menu,
  MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles, Tag, Users,
  X, Zap,
} from 'lucide-react';
import { supabase } from './supabase';
import './styles.css';

const STORAGE_KEY = 'taskflow-board-v1';
const defaultColumns = [
  { id: 'todo', title: 'To do', color: 'violet' },
  { id: 'progress', title: 'In progress', color: 'blue' },
  { id: 'done', title: 'Done', color: 'green' },
];
const seedTasks = [
  { id: 't-1', title: 'Map out the new onboarding flow', description: 'Review friction points and define the first-run experience.', columnId: 'todo', priority: 'High', label: 'Product', dueDate: '2026-10-16', assignee: 'Olivia Chen', initials: 'OC', avatar: 'lavender', order: 0 },
  { id: 't-2', title: 'Collect customer feedback', description: 'Summarize notes from the last five interviews.', columnId: 'todo', priority: 'Medium', label: 'Research', dueDate: '2026-10-19', assignee: 'Noah Williams', initials: 'NW', avatar: 'peach', order: 1 },
  { id: 't-3', title: 'Update empty states', description: 'Make first-time screens helpful and actionable.', columnId: 'todo', priority: 'Low', label: 'Design', dueDate: '2026-10-21', assignee: 'Mia Patel', initials: 'MP', avatar: 'mint', order: 2 },
  { id: 't-4', title: 'Build dashboard components', description: 'Reusable cards, activity feed, and project overview.', columnId: 'progress', priority: 'High', label: 'Development', dueDate: '2026-10-14', assignee: 'Ethan Brooks', initials: 'EB', avatar: 'blue', order: 0 },
  { id: 't-5', title: 'Review mobile breakpoints', description: 'Check navigation, dialogs, and board interactions.', columnId: 'progress', priority: 'Medium', label: 'Design', dueDate: '2026-10-17', assignee: 'Mia Patel', initials: 'MP', avatar: 'mint', order: 1 },
  { id: 't-6', title: 'Set up component library', description: 'Document tokens and shared UI patterns.', columnId: 'done', priority: 'Low', label: 'Development', dueDate: '2026-10-10', assignee: 'Olivia Chen', initials: 'OC', avatar: 'lavender', order: 0 },
];

function loadInitial() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return seedTasks;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : seedTasks;
  } catch { return seedTasks; }
}
function safeText(value, max = 160) { return String(value ?? '').trim().slice(0, max); }
function dateLabel(value) {
  if (!value) return 'No due date';
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? 'No due date' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function Toast({ toast, onClose }) {
  useEffect(() => { if (!toast) return; const id = setTimeout(onClose, 3200); return () => clearTimeout(id); }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`toast ${toast.type || 'success'}`} role={toast.type === 'error' ? 'alert' : 'status'}><span className="toast-icon">{toast.type === 'error' ? <CircleHelp size={18}/> : <Check size={18}/>}</span><span>{toast.message}</span><button className="icon-button toast-close" onClick={onClose} aria-label="Dismiss notification"><X size={16}/></button></div>;
}
function TaskCard({ task, onEdit, overlay = false }) {
  const sortable = useSortable({ id: task.id, disabled: overlay });
  const style = overlay ? {} : { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? .35 : 1 };
  return <article ref={overlay ? undefined : sortable.setNodeRef} style={style} className={`task-card ${overlay ? 'drag-overlay' : ''}`}>
    <div className="task-topline"><span className={`label-pill ${task.label.toLowerCase()}`}>{task.label}</span><button className="icon-button task-menu" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}><MoreHorizontal size={18}/></button></div>
    <button className="task-title-button" onClick={() => onEdit(task)}><h3>{task.title}</h3></button>
    {task.description && <p className="task-description">{task.description}</p>}
    <div className="task-meta"><span className={`priority ${task.priority.toLowerCase()}`}><i/> {task.priority}</span><span className="due-date"><CalendarDays size={13}/>{dateLabel(task.dueDate)}</span></div>
    <div className="task-footer"><span className={`avatar ${task.avatar || 'lavender'}`} title={task.assignee || 'Unassigned'}>{task.initials || '?'}</span><span className="assignee-name">{task.assignee || 'Unassigned'}</span><button className="drag-handle" aria-label={`Drag ${task.title}`} {...(overlay ? {} : sortable.attributes)} {...(overlay ? {} : sortable.listeners)}><span>⠿</span></button></div>
  </article>;
}
function Column({ column, tasks, onAdd, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return <section ref={setNodeRef} className={`board-column ${column.color} ${isOver ? 'is-over' : ''}`}>
    <div className="column-heading"><span className="column-indicator"/><h2>{column.title}</h2><span className="count-badge">{tasks.length}</span><button className="icon-button column-more" aria-label={`More options for ${column.title}`}><MoreHorizontal size={18}/></button></div>
    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <div className="column-cards">{tasks.map(task => <TaskCard key={task.id} task={task} onEdit={onEdit}/>)}</div>
    </SortableContext>
    {tasks.length === 0 && <div className="empty-drop"><span>Drop a task here</span></div>}
    <button className="add-task-inline" onClick={() => onAdd(column.id)}><Plus size={16}/> Add a task</button>
  </section>;
}
function TaskDialog({ dialog, onClose, onSave, onDelete }) {
  const editing = Boolean(dialog?.task);
  const [title, setTitle] = useState(dialog?.task?.title || '');
  const [description, setDescription] = useState(dialog?.task?.description || '');
  const [columnId, setColumnId] = useState(dialog?.task?.columnId || dialog?.columnId || 'todo');
  const [priority, setPriority] = useState(dialog?.task?.priority || 'Medium');
  const [label, setLabel] = useState(dialog?.task?.label || 'Product');
  const [dueDate, setDueDate] = useState(dialog?.task?.dueDate || '');
  const [assignee, setAssignee] = useState(dialog?.task?.assignee || '');
  const [error, setError] = useState('');
  if (!dialog) return null;
  function submit(e) {
    e.preventDefault(); const cleanTitle = safeText(title, 160);
    if (!cleanTitle) { setError('A task title is required.'); return; }
    if (description.length > 5000) { setError('Description must be 5,000 characters or fewer.'); return; }
    onSave({ ...(dialog.task || {}), id: dialog.task?.id || crypto.randomUUID(), title: cleanTitle, description: safeText(description, 5000), columnId, priority, label, dueDate, assignee: safeText(assignee, 80), initials: safeText(assignee.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(), 2) || '?', avatar: dialog.task?.avatar || 'lavender' });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="task-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-heading"><div><p className="eyebrow">TASK DETAILS</p><h2 id="dialog-title">{editing ? 'Edit task' : 'Create a task'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div><form onSubmit={submit} className="dialog-form"><label>Task title<input autoFocus maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your task a clear title"/></label><label>Description<textarea maxLength={5000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details, context, or acceptance criteria"/></label><div className="form-grid"><label>Status<select value={columnId} onChange={e => setColumnId(e.target.value)}>{defaultColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}>{['Low','Medium','High'].map(x => <option key={x}>{x}</option>)}</select></label><label>Category<select value={label} onChange={e => setLabel(e.target.value)}>{['Product','Design','Development','Research','Marketing'].map(x => <option key={x}>{x}</option>)}</select></label><label>Due date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/></label></div><label>Assignee<input maxLength={80} value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Name (optional)"/></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="dialog-actions">{editing && <button type="button" className="danger-button" onClick={() => onDelete(dialog.task.id)}>Delete task</button>}<span className="action-spacer"/><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{editing ? 'Save changes' : 'Create task'}</button></div></form></section></div>;
}
function App() {
  const [tasks, setTasks] = useState(loadInitial);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('All priorities');
  const [dialog, setDialog] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [activeNav, setActiveNav] = useState('Board');
  const [session, setSession] = useState(null);
  const [cloudMode, setCloudMode] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { if (!supabase) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch { setToast({ type: 'error', message: 'Browser storage is unavailable. Your changes may not persist.' }); } } }, [tasks]);
  useEffect(() => { if (!supabase) return; let alive = true; supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session); }); const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); }); return () => { alive = false; listener.subscription.unsubscribe(); }; }, []);
  const filteredTasks = useMemo(() => tasks.filter(t => `${t.title} ${t.description} ${t.assignee} ${t.label}`.toLowerCase().includes(search.toLowerCase()) && (filterPriority === 'All priorities' || t.priority === filterPriority)), [tasks, search, filterPriority]);
  const activeTask = tasks.find(t => t.id === activeId);
  const completed = tasks.filter(t => t.columnId === 'done').length;
  const showToast = (message, type = 'success') => setToast({ message, type });
  function saveTask(task) { setTasks(prev => { const exists = prev.some(t => t.id === task.id); return exists ? prev.map(t => t.id === task.id ? task : t) : [...prev, task]; }); setDialog(null); showToast(dialog?.task ? 'Task updated successfully.' : 'Task created successfully.'); }
  function deleteTask(id) { setTasks(prev => prev.filter(t => t.id !== id)); setDialog(null); showToast('Task deleted.'); }
  function onDragEnd({ active, over }) {
    setActiveId(null); if (!over) return;
    const source = tasks.find(t => t.id === active.id); if (!source) return;
    const targetTask = tasks.find(t => t.id === over.id);
    const targetColumn = defaultColumns.find(c => c.id === over.id);
    const destinationId = targetTask?.columnId || targetColumn?.id;
    if (!destinationId) return;
    if (source.columnId !== destinationId) {
      setTasks(prev => prev.map(t => t.id === source.id ? { ...t, columnId: destinationId } : t));
      showToast(`Moved “${source.title}” to ${defaultColumns.find(c => c.id === destinationId)?.title}.`);
    } else if (targetTask && targetTask.id !== source.id) {
      setTasks(prev => { const group = prev.filter(t => t.columnId === source.columnId).sort((a,b) => a.order - b.order); const oldIndex = group.findIndex(t => t.id === source.id); const newIndex = group.findIndex(t => t.id === targetTask.id); const reordered = arrayMove(group, oldIndex, newIndex).map((t,i) => ({...t, order:i})); return [...prev.filter(t => t.columnId !== source.columnId), ...reordered]; });
    }
  }
  async function signIn() { if (!supabase) { showToast('Add Supabase URL and anon key to .env to enable cloud sign-in.', 'error'); return; } const email = window.prompt('Enter your email to receive a sign-in link:'); if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid email address.', 'error'); return; } const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } }); if (error) showToast(error.message, 'error'); else showToast('Check your email for the sign-in link.'); }
  async function signOut() { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) showToast(error.message, 'error'); else showToast('Signed out.'); } }
  const navItems = [{ name: 'Board', icon: LayoutGrid }, { name: 'My tasks', icon: ListTodo }, { name: 'Activity', icon: Activity }];
  return <div className="app-shell"><aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><a className="brand" href="#home" onClick={() => setActiveNav('Board')}><span className="brand-mark"><Command size={21}/></span><span>taskflow<span className="brand-period">.</span></span></a><button className="workspace-switcher"><span className="workspace-avatar">S</span><span className="workspace-switch-text"><strong>Studio North</strong><small>Free workspace</small></span><ChevronDown size={16}/></button><div className="sidebar-label">WORKSPACE</div><nav className="main-nav" aria-label="Main navigation">{navItems.map(({name,icon:Icon}) => <button key={name} className={`nav-item ${activeNav === name ? 'active' : ''}`} onClick={() => { setActiveNav(name); setMobileNav(false); if (name !== 'Board') showToast(`${name} view is ready to connect to your workspace data.`); }}><Icon size={18}/><span>{name}</span>{name === 'My tasks' && <span className="nav-count">{tasks.filter(t => t.assignee === 'Olivia Chen').length}</span>}</button>)}</nav><div className="sidebar-label projects-label">YOUR PROJECTS <button className="tiny-icon" aria-label="Add project" onClick={() => showToast('Project creation can be added to your workspace settings.')}><Plus size={15}/></button></div><button className="project-item selected"><span className="project-dot violet-dot"/>Website redesign</button><button className="project-item" onClick={() => showToast('Connect another project to get started.')}><span className="project-dot orange-dot"/>Mobile application</button><button className="project-item" onClick={() => showToast('Connect another project to get started.')}><span className="project-dot green-dot"/>Marketing site</button><div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={17}/></div><strong>Make work flow</strong><p>Bring your team together and ship great work.</p><button onClick={() => showToast('Workspace plans are not connected in local demo mode.')}>Explore plans <span>↗</span></button></div><button className="profile-row" onClick={session ? signOut : signIn}><span className="avatar lavender">{session?.user?.email?.[0]?.toUpperCase() || 'JD'}</span><span className="profile-info"><strong>{session?.user?.email || 'Jordan Davis'}</strong><small>{session ? 'Signed in · Sign out' : 'Product designer'}</small></span>{session ? <LogOut size={16}/> : <ChevronDown size={16}/>}</button></div></aside>
  {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
  <main className="main-content"><header className="topbar"><button className="icon-button mobile-menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="breadcrumbs"><span>Projects</span><span className="crumb-separator">/</span><strong>Website redesign</strong></div><div className="topbar-actions"><div className="avatar-stack" aria-label="Project team: 4 members"><span className="avatar lavender">OC</span><span className="avatar peach">NW</span><span className="avatar mint">MP</span><span className="avatar blue">+1</span></div><button className="invite-button" onClick={() => showToast('Invite links require a configured team backend.')}><Plus size={15}/> Invite</button><span className="topbar-divider"/><button className="icon-button notification-button" aria-label="Notifications" onClick={() => showToast('You are all caught up!')}><Bell size={19}/><i/></button><button className="help-button" aria-label="Help" onClick={() => showToast('Tip: drag a task between columns, or open it to edit details.')}><CircleHelp size={19}/></button></div></header>
  <div className="page-content"><div className="page-title-row"><div><div className="title-kicker"><span className="project-dot violet-dot"/> PROJECT BOARD <span className="title-dot-sep">·</span> <span>Updated just now</span></div><h1>Website redesign <button className="title-dropdown" aria-label="Project options" onClick={() => showToast('Project settings are not connected in demo mode.')}><ChevronDown size={19}/></button></h1><p className="page-subtitle">A little progress each day adds up to big results.</p></div><button className="share-button" onClick={() => showToast('Invite links require a configured team backend.')}><Users size={17}/> Share board</button></div>
  <div className="stats-row"><div className="stat-card"><span className="stat-icon total"><LayoutGrid size={18}/></span><div><span className="stat-label">Total tasks</span><strong>{tasks.length}</strong></div><span className="stat-trend"><Activity size={13}/> All time</span></div><div className="stat-card"><span className="stat-icon progress-stat"><Zap size={18}/></span><div><span className="stat-label">In progress</span><strong>{tasks.filter(t => t.columnId === 'progress').length}</strong></div><span className="stat-note">Active now</span></div><div className="stat-card"><span className="stat-icon completed-stat"><CheckCheck size={18}/></span><div><span className="stat-label">Completed</span><strong>{completed}</strong></div><span className="stat-trend"><span className="trend-dot"/> Nice work!</span></div><div className="stat-card progress-overview"><div className="progress-copy"><span className="stat-label">Project progress</span><strong>{tasks.length ? Math.round(completed / tasks.length * 100) : 0}%</strong></div><div className="progress-track"><span style={{width: `${tasks.length ? completed / tasks.length * 100 : 0}%`}}/></div><span className="progress-foot">{completed} of {tasks.length} tasks completed</span></div></div>
  <section className="board-section"><div className="board-toolbar"><div className="view-tabs"><button className="view-tab active"><LayoutGrid size={16}/> Board</button><button className="view-tab" onClick={() => showToast('List view is planned for a future iteration.')}><AlignLeft size={16}/> List</button></div><div className="board-tools"><label className="search-box"><Search size={16}/><input aria-label="Search tasks" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X size={13}/></button>}<kbd>⌘ K</kbd></label><label className="filter-select"><Filter size={15}/><select aria-label="Filter by priority" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>{['All priorities','High','Medium','Low'].map(x => <option key={x}>{x}</option>)}</select></label><button className="icon-button board-settings" aria-label="Board settings" onClick={() => showToast('Board settings are not connected in demo mode.')}><Settings2 size={18}/></button></div></div>
  <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={({active}) => setActiveId(active.id)} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}><div className="kanban-board">{defaultColumns.map(column => <Column key={column.id} column={column} tasks={filteredTasks.filter(t => t.columnId === column.id).sort((a,b) => a.order - b.order)} onAdd={columnId => setDialog({columnId})} onEdit={task => setDialog({task})}/>)}</div><DragOverlay>{activeTask ? <TaskCard task={activeTask} onEdit={() => {}} overlay/> : null}</DragOverlay></DndContext>
  {filteredTasks.length === 0 && <div className="no-results"><Search size={22}/><strong>No tasks found</strong><span>Try a different search or priority filter.</span><button className="secondary-button" onClick={() => {setSearch('');setFilterPriority('All priorities');}}>Clear filters</button></div>}
  <div className="board-footer"><span><span className="live-dot"/> All changes saved {supabase ? '· Cloud configured' : '· Saved in this browser'}</span><button onClick={() => setDialog({columnId:'todo'})}><Plus size={15}/> New task</button></div></section>
  <footer className="app-footer"><span>© {new Date().getFullYear()} TaskFlow, Inc.</span><span><ShieldCheck size={13}/> Your workspace, your flow</span><button onClick={() => showToast('Help center is not configured in this starter project.')}>Help & feedback</button></footer></div></main><TaskDialog key={dialog?.task?.id || dialog?.columnId || 'closed'} dialog={dialog} onClose={() => setDialog(null)} onSave={saveTask} onDelete={deleteTask}/><Toast toast={toast} onClose={() => setToast(null)}/></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
