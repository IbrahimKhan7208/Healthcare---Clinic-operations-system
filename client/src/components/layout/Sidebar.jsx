import { NavLink } from 'react-router-dom';
import {
  MessagesSquare,
  Users,
  Stethoscope,
  CalendarDays,
  KanbanSquare,
  ScanLine,
  Sunrise,
  LifeBuoy,
  ClipboardCheck,
  Inbox,
  Sparkles,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navigationGroups = [
  {
    label: 'Workspace',
    links: [
      { to: '/ops-brief', label: 'Operations brief', icon: Sunrise },
      { to: '/action-inbox', label: 'Action inbox', icon: Inbox },
      { to: '/agent', label: 'Operations assistant', icon: MessagesSquare },
    ],
  },
  {
    label: 'Care coordination',
    links: [
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
      { to: '/patients', label: 'Patients', icon: Users },
      { to: '/doctors', label: 'Doctors', icon: Stethoscope },
      { to: '/pipeline', label: 'Patient pipeline', icon: KanbanSquare },
    ],
  },
  {
    label: 'Review queues',
    links: [
      { to: '/confirmations', label: 'Confirmation queue', icon: ClipboardCheck },
      { to: '/referrals', label: 'Referral review', icon: ScanLine },
      { to: '/handoff', label: 'Handoff inbox', icon: LifeBuoy },
    ],
  },
];

function NavItem({ to, label, icon: Icon, muted }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [styles.link, isActive ? styles.linkActive : '', muted ? styles.linkMuted : ''].join(' ')
      }
    >
      <Icon size={17} strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <nav className={styles.rail}>
      <div className={styles.brand}>
        <span className={styles.mark}><Sparkles size={17} strokeWidth={2} /></span>
        <span><strong>Careflow Console</strong><small>Clinic operations</small></span>
      </div>

      <div className={styles.navigation}>
        {navigationGroups.map((group) => (
          <section className={styles.group} key={group.label} aria-label={group.label}>
            <div className={styles.section}>{group.label}</div>
            {group.links.map((link) => <NavItem key={link.to} {...link} />)}
          </section>
        ))}
      </div>
    </nav>
  );
}
