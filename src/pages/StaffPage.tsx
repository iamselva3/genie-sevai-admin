import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Avatar, Button, EmptyState, ErrorBox, IconButton, PageHeader, Pill, SelectField, Spinner, Switch, TableWrap, TextField } from '../components/ui';
import { useStaff } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';
import { dateTimeText } from '../lib/format';
import type { StaffRole, StaffUser } from '../lib/types';

const KEY = ['admin', 'staff'];
const ROLES = [
  { value: 'admin', label: 'Admin: everything, including staff' },
  { value: 'manager', label: 'Manager: operations and catalogue' },
];

export default function StaffPage() {
  const me = useStaff();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: () => api<{ users: StaffUser[] }>('/admin/staff').then((r) => r.users),
  });
  const toggle = useMutation({
    mutationFn: (v: { user: StaffUser; isActive: boolean }) => api<{ user: StaffUser }>(`/admin/staff/${v.user.id}`, { method: 'PATCH', body: { isActive: v.isActive } }),
    onSuccess: (_r, v) => {
      toast.success(`${v.user.name} ${v.isActive ? 'can sign in' : 'can no longer sign in'}`);
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="People who can sign in to this admin panel."
        actions={
          <Button variant="accent" icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => setEditing('new')}>
            Add staff
          </Button>
        }
      />
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => refetch()} />}
      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading staff" />
        ) : !data || data.length === 0 ? (
          <EmptyState title="No staff" />
        ) : (
          <TableWrap>
            <table className="table min-w-[620px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Last sign-in</th>
                  <th>Access</th>
                  <th className="w-12">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div>
                            <p className="font-semibold">
                              {u.name} {self && <span className="font-normal text-mute">(you)</span>}
                            </p>
                            <p className="text-xs text-mute">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{u.role === 'admin' ? <Pill tone="ink">Admin</Pill> : <Pill>Manager</Pill>}</td>
                      <td className="text-xs whitespace-nowrap">{dateTimeText(u.lastLoginAt)}</td>
                      <td>
                        <Switch checked={u.isActive} label={`${u.name} can sign in`} disabled={self} onChange={(v) => toggle.mutate({ user: u, isActive: v })} />
                      </td>
                      <td>
                        <IconButton label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>

      <StaffForm
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        open={editing !== null}
        user={editing === 'new' ? null : editing}
        isSelf={editing !== null && editing !== 'new' && editing.id === me?.id}
        onClose={() => setEditing(null)}
        onSaved={(u, isNew) => {
          toast.success(isNew ? `${u.name} added` : `${u.name} saved`);
          qc.invalidateQueries({ queryKey: KEY });
          setEditing(null);
        }}
      />
    </div>
  );
}

function StaffForm({
  open,
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: StaffUser | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (u: StaffUser, isNew: boolean) => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<StaffRole>(user?.role || 'manager');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      user
        ? api<{ user: StaffUser }>(`/admin/staff/${user.id}`, { method: 'PATCH', body }).then((r) => r.user)
        : api<{ user: StaffUser }>('/admin/staff', { method: 'POST', body }).then((r) => r.user),
    onSuccess: (u) => onSaved(u, !user),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter a name';
    if (!user && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if ((!user || password) && password.length < 8) next.password = 'Use at least 8 characters';
    setErrors(next);
    if (Object.keys(next).length) return;
    const body: Record<string, unknown> = user ? { name: name.trim(), role } : { name: name.trim(), email: email.trim(), role, password };
    if (user && password) body.password = password;
    mutation.mutate(body);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Edit ${user.name}` : 'Add staff member'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" busy={mutation.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Name" id="staff-name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField label="Email" id="staff-email" type="email" value={email} disabled={!!user} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <SelectField
          label="Role"
          id="staff-role"
          value={role}
          disabled={isSelf}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          options={ROLES}
          hint={isSelf ? 'You cannot change your own role' : undefined}
        />
        <TextField
          label="Password"
          id="staff-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={user ? 'Leave empty to keep the current password' : 'At least 8 characters'}
        />
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Modal>
  );
}
