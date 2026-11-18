import clsx from 'clsx';
import {
  CalendarCheck,
  ClipboardList,
  GalleryHorizontal,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  Star,
  Tags,
  Ticket,
  UserRound,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useStaff } from '../context/AuthContext';
import { Wordmark } from './Brand';
import { Avatar } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
      { to: '/professionals', label: 'Professionals', icon: Wrench },
      { to: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/services', label: 'Services', icon: Layers },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/cities', label: 'Cities', icon: MapPin },
      { to: '/coupons', label: 'Coupons', icon: Ticket },
      { to: '/banners', label: 'Banners', icon: GalleryHorizontal },
    ],
  },
  {
    title: 'Support',
    items: [
      { to: '/reviews', label: 'Reviews', icon: Star },
      { to: '/enquiries', label: 'Enquiries', icon: Inbox },
      { to: '/applications', label: 'Pro applications', icon: ClipboardList },
      { to: '/staff', label: 'Staff', icon: ShieldCheck, adminOnly: true },
    ],
  },
];

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const staff = useStaff();
  const { logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="px-5 pt-6 pb-5">
        <Wordmark tone="light" />
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">{section.title}</p>
            <ul className="flex flex-col gap-0.5">
              {section.items
                .filter((i) => !i.adminOnly || staff?.role === 'admin')
                .map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          isActive ? 'bg-yellow text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      <item.icon className="size-4" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      {staff && (
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
          <Avatar name={staff.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{staff.name}</p>
            <p className="truncate text-xs text-white/55 capitalize">{staff.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export function StaffLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const staff = useStaff();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SideNav />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-black/5"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Wordmark tone="dark" />
        <span className="inline-flex size-9 items-center justify-center">
          {staff ? <Avatar name={staff.name} size="sm" /> : <UserRound className="size-5" aria-hidden="true" />}
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="animate-pop absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-5 right-3 z-10 inline-flex size-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SideNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
