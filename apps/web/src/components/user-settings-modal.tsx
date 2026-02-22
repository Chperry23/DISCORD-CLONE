"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { updateProfile } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getAudioDevices, getMicStream, getAudioLevel } from "@/lib/media";
import type { UserResponse } from "@discord-clone/shared";
import type { MediaDeviceInfo as DeviceInfo } from "@/lib/media";

interface Props {
  user: UserResponse;
  onClose: () => void;
  onUpdated: (user: UserResponse) => void;
}

type SettingsTab = "account" | "profile" | "voice" | "appearance" | "notifications";

const TABS: { id: SettingsTab; label: string; section?: string }[] = [
  { id: "account", label: "My Account", section: "User Settings" },
  { id: "profile", label: "Profiles" },
  { id: "voice", label: "Voice & Video", section: "App Settings" },
  { id: "appearance", label: "Appearance" },
  { id: "notifications", label: "Notifications" },
];

export function UserSettingsModal({ user, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<SettingsTab>("account");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex bg-surface-950">
      {/* Sidebar */}
      <div className="flex w-[232px] shrink-0 flex-col border-r border-surface-700/50 bg-surface-900/80">
        <div className="flex-1 overflow-y-auto px-2 py-6">
          {TABS.map((t, i) => (
            <div key={t.id}>
              {t.section && (
                <p className={`px-3 text-[11px] font-bold uppercase tracking-wider text-surface-400 ${i > 0 ? "mt-4" : ""} mb-1`}>
                  {t.section}
                </p>
              )}
              <button
                onClick={() => setTab(t.id)}
                className={`w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-surface-700/80 text-white"
                    : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
                }`}
              >
                {t.label}
              </button>
            </div>
          ))}

          <div className="mx-2 my-3 border-t border-surface-700/50" />

          <button
            onClick={onClose}
            className="w-full rounded-md px-3 py-1.5 text-left text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-10 py-8">
          <div className="mx-auto max-w-[660px]">
            {tab === "account" && <AccountTab user={user} />}
            {tab === "profile" && <ProfileTab user={user} onUpdated={onUpdated} />}
            {tab === "voice" && <VoiceVideoTab />}
            {tab === "appearance" && <AppearanceTab />}
            {tab === "notifications" && <NotificationsTab />}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-surface-600 text-surface-400 transition hover:border-surface-400 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Account Tab ──────────────────────────────────────

function AccountTab({ user }: { user: UserResponse }) {
  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">My Account</h2>

      <div className="overflow-hidden rounded-xl border border-surface-700/50">
        <div className="h-24 bg-gradient-to-r from-brand-600 to-brand-400" />
        <div className="relative bg-surface-800/50 px-4 pb-4">
          <div className="-mt-10 mb-2 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-3xl font-bold text-white ring-4 ring-surface-800">
              {(user.displayName ?? user.username)[0]?.toUpperCase()}
            </div>
            <div className="pb-1">
              <p className="text-lg font-bold">{user.displayName ?? user.username}</p>
              <p className="text-sm text-surface-400">@{user.username}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <SettingsField label="Username" value={user.username} />
        <SettingsField label="Email" value={user.email} />
        <SettingsField label="Member Since" value={new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
      </div>

      <div className="mt-8 border-t border-surface-700/50 pt-6">
        <h3 className="mb-2 text-base font-bold text-red-400">Danger Zone</h3>
        <p className="mb-4 text-sm text-surface-400">Deleting your account is permanent and cannot be undone.</p>
        <button className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20">
          Delete Account
        </button>
      </div>
    </div>
  );
}

// ── Profile Tab ──────────────────────────────────────

function ProfileTab({ user, onUpdated }: { user: UserResponse; onUpdated: (u: UserResponse) => void }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError("");
    setLoading(true);
    try {
      const updated = await updateProfile({ displayName: displayName || undefined });
      onUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">Profiles</h2>

      <div className="grid grid-cols-[1fr_auto] gap-8">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Display Name</label>
            <input
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user.username}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Avatar</label>
            <button className="rounded-md border border-surface-600 bg-surface-800 px-4 py-2 text-sm text-surface-300 transition hover:border-brand-500 hover:text-white">
              Change Avatar
            </button>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Banner Color</label>
            <div className="flex gap-2">
              {["from-brand-600 to-brand-400", "from-red-600 to-orange-400", "from-green-600 to-emerald-400", "from-blue-600 to-cyan-400", "from-purple-600 to-pink-400"].map((grad) => (
                <button key={grad} className={`h-8 w-14 rounded-md bg-gradient-to-r ${grad} ring-2 ring-transparent transition hover:ring-white/50`} />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          <button onClick={handleSave} disabled={loading} className="btn-primary px-6">
            {loading ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Preview */}
        <div className="w-[280px]">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-surface-400">Preview</p>
          <div className="overflow-hidden rounded-xl border border-surface-700/50 bg-surface-900">
            <div className="h-16 bg-gradient-to-r from-brand-600 to-brand-400" />
            <div className="relative px-3 pb-3">
              <div className="-mt-8 mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white ring-4 ring-surface-900">
                {(displayName || user.username)[0]?.toUpperCase()}
              </div>
              <p className="font-bold">{displayName || user.username}</p>
              <p className="text-xs text-surface-400">@{user.username}</p>
              <div className="mt-3 border-t border-surface-700/50 pt-3">
                <p className="text-xs font-bold uppercase text-surface-400">Member Since</p>
                <p className="text-xs text-surface-300">{new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Voice & Video Tab ────────────────────────────────

function VoiceVideoTab() {
  const [inputs, setInputs] = useState<DeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<DeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [inputVolume, setInputVolume] = useState(100);
  const [outputVolume, setOutputVolume] = useState(100);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoSensitivity, setAutoSensitivity] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [testing, setTesting] = useState(false);
  const testStreamRef = useRef<MediaStream | null>(null);
  const levelFnRef = useRef<(() => number) | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    getAudioDevices().then(({ inputs: i, outputs: o }) => {
      setInputs(i);
      setOutputs(o);
      if (i.length > 0 && !selectedInput) setSelectedInput(i[0]!.deviceId);
      if (o.length > 0 && !selectedOutput) setSelectedOutput(o[0]!.deviceId);
    });
  }, []);

  const startTest = useCallback(async () => {
    try {
      const stream = await getMicStream(selectedInput || undefined);
      testStreamRef.current = stream;
      levelFnRef.current = getAudioLevel(stream);
      setTesting(true);

      function animate() {
        if (levelFnRef.current) setMicLevel(levelFnRef.current());
        animRef.current = requestAnimationFrame(animate);
      }
      animRef.current = requestAnimationFrame(animate);
    } catch {
      alert("Could not access microphone");
    }
  }, [selectedInput]);

  const stopTest = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    testStreamRef.current?.getTracks().forEach((t) => t.stop());
    testStreamRef.current = null;
    levelFnRef.current = null;
    setTesting(false);
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      testStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">Voice & Video</h2>

      {/* Voice Settings */}
      <h3 className="mb-4 text-base font-bold">Voice</h3>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Input Device</label>
            <select
              value={selectedInput}
              onChange={(e) => setSelectedInput(e.target.value)}
              className="input-field text-sm"
            >
              {inputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
              {inputs.length === 0 && <option>No microphones found</option>}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Output Device</label>
            <select
              value={selectedOutput}
              onChange={(e) => setSelectedOutput(e.target.value)}
              className="input-field text-sm"
            >
              {outputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
              {outputs.length === 0 && <option>Default</option>}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Input Volume</label>
            <input
              type="range"
              min={0}
              max={200}
              value={inputVolume}
              onChange={(e) => setInputVolume(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <p className="text-xs text-surface-400 text-right">{inputVolume}%</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Output Volume</label>
            <input
              type="range"
              min={0}
              max={200}
              value={outputVolume}
              onChange={(e) => setOutputVolume(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <p className="text-xs text-surface-400 text-right">{outputVolume}%</p>
          </div>
        </div>

        {/* Mic Test */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-surface-300">Mic Test</label>
          <p className="mb-2 text-sm text-surface-400">
            {testing ? "Speak into your microphone to test." : "Start a test to check your microphone."}
          </p>
          {testing && (
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-700">
              <div className="h-full rounded-full bg-green-400 transition-all duration-75" style={{ width: `${Math.min(micLevel * 300, 100)}%` }} />
            </div>
          )}
          <button onClick={testing ? stopTest : startTest} className={testing ? "btn-secondary text-sm" : "btn-primary text-sm"}>
            {testing ? "Stop Testing" : "Let's Check"}
          </button>
        </div>
      </div>

      <div className="my-8 border-t border-surface-700/50" />

      {/* Input Mode */}
      <h3 className="mb-4 text-base font-bold">Input Mode</h3>
      <div className="space-y-4">
        <ToggleSetting label="Automatically Adjust Input Sensitivity" description="Controls how much sound is needed to transmit your voice." value={autoSensitivity} onChange={setAutoSensitivity} />
      </div>

      <div className="my-8 border-t border-surface-700/50" />

      {/* Advanced */}
      <h3 className="mb-4 text-base font-bold">Advanced</h3>
      <div className="space-y-4">
        <ToggleSetting label="Echo Cancellation" description="Prevents echo from being transmitted to others." value={echoCancellation} onChange={setEchoCancellation} />
        <ToggleSetting label="Noise Suppression" description="Reduces background noise from your microphone." value={noiseSuppression} onChange={setNoiseSuppression} />
      </div>
    </div>
  );
}

// ── Appearance Tab ───────────────────────────────────

function AppearanceTab() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [fontSize, setFontSize] = useState(16);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">Appearance</h2>

      <h3 className="mb-4 text-base font-bold">Theme</h3>
      <div className="mb-6 flex gap-4">
        <ThemeCard label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} bg="bg-surface-900" fg="bg-surface-700" />
        <ThemeCard label="Light" active={theme === "light"} onClick={() => setTheme("light")} bg="bg-gray-100" fg="bg-white" />
      </div>

      <div className="my-6 border-t border-surface-700/50" />

      <h3 className="mb-4 text-base font-bold">Chat Font Size</h3>
      <div className="flex items-center gap-4">
        <span className="text-xs text-surface-400">12px</span>
        <input
          type="range"
          min={12}
          max={24}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <span className="text-xs text-surface-400">24px</span>
        <span className="min-w-[40px] text-right text-sm font-medium">{fontSize}px</span>
      </div>

      <div className="my-6 border-t border-surface-700/50" />

      <ToggleSetting label="Compact Mode" description="Display messages in a more compact format." value={compactMode} onChange={setCompactMode} />
    </div>
  );
}

function ThemeCard({ label, active, onClick, bg, fg }: { label: string; active: boolean; onClick: () => void; bg: string; fg: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-36 overflow-hidden rounded-xl border-2 transition ${active ? "border-brand-500" : "border-surface-700 hover:border-surface-600"}`}
    >
      <div className={`${bg} p-3 h-20 flex flex-col gap-1.5`}>
        <div className={`${fg} h-2 w-16 rounded`} />
        <div className={`${fg} h-2 w-12 rounded`} />
        <div className={`${fg} h-2 w-20 rounded`} />
      </div>
      <div className="bg-surface-800 px-3 py-2 text-center text-sm font-medium">{label}</div>
    </button>
  );
}

// ── Notifications Tab ────────────────────────────────

function NotificationsTab() {
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold">Notifications</h2>

      <div className="space-y-4">
        <ToggleSetting label="Enable Desktop Notifications" description="Show notification popups for new messages." value={desktopNotifs} onChange={setDesktopNotifs} />
        <ToggleSetting label="Enable Sounds" description="Play sounds for messages, joins, and other events." value={sounds} onChange={setSounds} />
        <ToggleSetting label="Message Notifications" description="Get notified when someone sends you a direct message." value={messageNotifs} onChange={setMessageNotifs} />
      </div>
    </div>
  );
}

// ── Shared Components ────────────────────────────────

function SettingsField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-700/50 bg-surface-800/50 p-4">
      <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-surface-400">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-surface-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-brand-500" : "bg-surface-600"}`}
      >
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${value ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
