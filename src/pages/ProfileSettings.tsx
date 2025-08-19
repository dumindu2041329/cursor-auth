import { useRef, useState } from 'react'
import SiteHeader from '../shared/SiteHeader'
import { useAuth } from '../auth/AuthContext'

async function resizeImageFile(file: File, maxSize = 320, quality = 0.85): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = objectUrl
    })
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const targetW = Math.max(1, Math.round(img.width * scale))
    const targetH = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, targetW, targetH)
    ctx.drawImage(img, 0, 0, targetW, targetH)
    // Use JPEG to keep size small; adjust quality if needed
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  )
}

function ProfileSettings() {
  const { user, updateProfile, changePassword } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatarUrl)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState<string | null>(null)
  const [passErr, setPassErr] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setProfileErr('Please select an image file')
      return
    }
    try {
      setSavingProfile(true)
      const dataUrl = await resizeImageFile(f, 320, 0.85)
      setAvatarUrl(dataUrl)
      await updateProfile({ avatarUrl: dataUrl })
      setProfileMsg('Avatar updated')
      setProfileErr(null)
    } catch (err: any) {
      setProfileErr('Failed to process image')
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileErr(null)
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      await updateProfile({ name, email, avatarUrl })
      setProfileMsg('Profile updated')
    } catch (err: any) {
      setProfileErr(err?.message ?? 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassErr(null)
    setPassMsg(null)
    if (newPassword.length < 8) {
      setPassErr('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPassErr('Passwords do not match')
      return
    }
    setSavingPass(true)
    try {
      await changePassword(currentPassword, newPassword)
      setPassMsg('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPassErr(err?.message ?? 'Failed to change password')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <div className="container" style={{ paddingTop: 40, paddingBottom: 64, display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.16)' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'var(--muted)' }}>{user?.name?.[0] ?? '?'}</span>
            </div>
          )}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>Profile Settings</h2>
          <div style={{ color: 'var(--muted)' }}>Manage your account information</div>
        </div>
      </div>

      <Section title="Profile">
        <form style={{ display: 'grid', gap: 12 }} onSubmit={saveProfile}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileInputRef} onChange={onPickAvatar} accept="image/*" type="file" style={{ display: 'none' }} />
            <button className="btn" type="button" onClick={() => fileInputRef.current?.click()}>Upload avatar</button>
            {avatarUrl && <button className="btn" type="button" onClick={async () => { setAvatarUrl(undefined); await updateProfile({ avatarUrl: '' }); setProfileMsg('Avatar removed') }}>Remove</button>}
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
          </label>
          {profileErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{profileErr}</div>}
          {profileMsg && <div style={{ color: '#22c55e', fontSize: 13 }}>{profileMsg}</div>}
          <button className="btn primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save changes'}</button>
        </form>
      </Section>

      <Section title="Password">
        <form style={{ display: 'grid', gap: 12 }} onSubmit={savePassword}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Current password</span>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required type="password" placeholder="••••••••" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>New password</span>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} type="password" placeholder="At least 8 characters" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>Confirm new password</span>
            <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} type="password" placeholder="Repeat new password" className="surface" style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', outline: 'none', color: 'var(--text)', background: 'rgba(0,0,0,0.2)' }} />
          </label>
          {passErr && <div style={{ color: '#ef4444', fontSize: 13 }}>{passErr}</div>}
          {passMsg && <div style={{ color: '#22c55e', fontSize: 13 }}>{passMsg}</div>}
          <button className="btn primary" type="submit" disabled={savingPass}>{savingPass ? 'Updating...' : 'Update password'}</button>
        </form>
      </Section>
      </div>
    </>
  )
}

export default ProfileSettings


