import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../lib/api';
import { refId } from '../lib/format';
import { CategoryIcon } from '../lib/icons';
import { asOptions, useCategories, useCities } from '../lib/lookups';
import type { Professional } from '../lib/types';
import { Drawer } from './Modal';
import { Button, ErrorBox, SelectField, TextAreaField, TextField } from './ui';

export interface ProfessionalPrefill {
  name?: string;
  phone?: string;
  cityName?: string;
  experienceYears?: number;
  bio?: string;
}

interface Props {
  open: boolean;
  professional: Professional | null;
  prefill?: ProfessionalPrefill;
  onClose: () => void;
  onSaved: (p: Professional, isNew: boolean) => void;
}

/** Create / edit a professional. Remount with a `key` to reset. */
export function ProfessionalForm({ open, professional, prefill, onClose, onSaved }: Props) {
  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const initialCity =
    refId(professional?.city) || (prefill?.cityName && cities?.find((c) => c.name.toLowerCase() === prefill.cityName!.toLowerCase())?.id) || '';

  const [name, setName] = useState(professional?.name || prefill?.name || '');
  const [phone, setPhone] = useState(professional?.phone || prefill?.phone || '');
  const [email, setEmail] = useState(professional?.email || '');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState(initialCity);
  const [skills, setSkills] = useState<string[]>(professional?.skills.map((s) => refId(s)) || []);
  const [experience, setExperience] = useState(String(professional?.experienceYears ?? prefill?.experienceYears ?? 0));
  const [bio, setBio] = useState(professional?.bio || prefill?.bio || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(professional?.status || 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      professional
        ? api<{ professional: Professional }>(`/admin/professionals/${professional.id}`, { method: 'PATCH', body }).then((r) => r.professional)
        : api<{ professional: Professional }>('/admin/professionals', { method: 'POST', body }).then((r) => r.professional),
    onSuccess: (p) => onSaved(p, !professional),
  });

  const effectiveCity = city || initialCity;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (name.trim().length < 2) next.name = 'Enter a name';
    if (!/^[6-9]\d{9}$/.test(digits)) next.phone = 'Enter a valid 10-digit mobile number';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if (!professional && password.length < 6) next.password = 'Use at least 6 characters';
    if (professional && password && password.length < 6) next.password = 'Use at least 6 characters';
    if (!effectiveCity) next.city = 'Choose a city';
    if (skills.length === 0) next.skills = 'Pick at least one skill';
    setErrors(next);
    if (Object.keys(next).length) return;
    const body: Record<string, unknown> = {
      name: name.trim(),
      phone: digits,
      email: email.trim(),
      city: effectiveCity,
      skills,
      experienceYears: Number(experience) || 0,
      bio: bio.trim(),
      status,
    };
    if (password) body.password = password;
    mutation.mutate(body);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={professional ? 'Edit professional' : 'New professional'}
      description={professional ? professional.phone : 'They sign in to the Professional portal with this phone number and password.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="pro-form" busy={mutation.isPending}>
            Save professional
          </Button>
        </>
      }
    >
      <form id="pro-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Full name" id="pro-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Phone number" id="pro-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          <TextField label="Email" id="pro-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="Optional" />
        </div>
        <TextField
          label="Password"
          id="pro-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={professional ? 'Leave empty to keep the current password' : 'At least 6 characters'}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="City"
            id="pro-city"
            value={effectiveCity}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Choose a city"
            options={asOptions(cities)}
            error={errors.city}
          />
          <TextField
            label="Experience (years)"
            id="pro-experience"
            inputMode="numeric"
            value={experience}
            onChange={(e) => setExperience(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold">Skills</legend>
          <div className="flex flex-wrap gap-2">
            {(categories || []).map((c) => {
              const on = skills.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSkills(on ? skills.filter((s) => s !== c.id) : [...skills, c.id])}
                  className={clsx(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium',
                    on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink',
                  )}
                >
                  <CategoryIcon name={c.icon} className="size-3.5" />
                  {c.name}
                </button>
              );
            })}
          </div>
          {errors.skills && <p className="mt-1.5 text-xs font-medium text-bad">{errors.skills}</p>}
        </fieldset>
        <TextAreaField label="Bio" id="pro-bio" value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        <SelectField
          label="Status"
          id="pro-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
          options={[
            { value: 'active', label: 'Active: can receive jobs' },
            { value: 'inactive', label: 'Inactive: no new jobs, cannot sign in' },
          ]}
        />
        {mutation.error && <ErrorBox message={errorMessage(mutation.error)} />}
      </form>
    </Drawer>
  );
}
