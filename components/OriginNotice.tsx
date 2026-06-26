"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return window.location.hostname === "127.0.0.1";
}

function getServerSnapshot() {
  return false;
}

export function OriginNotice() {
  const isLoopbackIp = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isLoopbackIp) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">You are viewing StackMap through 127.0.0.1.</p>
      <p className="mt-1">
        Browser data is saved separately for 127.0.0.1 and localhost. Use{" "}
        <a className="font-semibold underline" href="http://localhost:3000">
          localhost:3000
        </a>{" "}
        if your earlier records were entered there.
      </p>
    </div>
  );
}
