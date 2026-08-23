"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SiteFrame } from "@/components/SiteFrame";
import { useAuth } from "@/contexts/AuthContext";
import {
  reconcileTunIdentity,
  safeTunNext,
  startTunSignIn,
} from "@/lib/tun-sso";

function TunAuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading, refreshProfile } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(true);

  const complete = searchParams.get("complete") === "1";
  const next = safeTunNext(searchParams.get("next"));

  useEffect(() => {
    if (started.current) return;

    if (!complete) {
      started.current = true;
      setWorking(true);
      void startTunSignIn(next).catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not start Tun sign-in.",
        );
        setWorking(false);
        started.current = false;
      });
      return;
    }

    if (loading) return;

    if (!session) {
      started.current = true;
      setError(
        "Tun sign-in did not finish. No paid access has been granted. Please try again.",
      );
      setWorking(false);
      return;
    }

    started.current = true;
    setWorking(true);
    setError("");

    void reconcileTunIdentity(session)
      .then(async () => {
        await refreshProfile();
        router.replace(next);
        router.refresh();
      })
      .catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Your Tun account could not be linked yet. No paid access has been granted.",
        );
        setWorking(false);
      });
  }, [complete, loading, next, refreshProfile, router, session]);

  function retry() {
    started.current = false;
    setError("");
    setWorking(true);

    if (complete && session) {
      started.current = true;
      void reconcileTunIdentity(session)
        .then(async () => {
          await refreshProfile();
          router.replace(next);
          router.refresh();
        })
        .catch((caught) => {
          setError(
            caught instanceof Error
              ? caught.message
              : "Your Tun account could not be linked yet.",
          );
          setWorking(false);
        });
      return;
    }

    void startTunSignIn(next).catch((caught) => {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start Tun sign-in.",
      );
      setWorking(false);
      started.current = false;
    });
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">Tun account</p>
      <h1>Connecting to Tun</h1>
      <p>
        Use the same TunApp account that owns your WooCommerce subscription.
        Paid features are unlocked only after the verified subscription is active.
      </p>

      {working && (
        <div className="page-state">
          <span className="spinner" /> Connecting to Tun…
        </div>
      )}

      {error && (
        <>
          <p className="form-message error">{error}</p>
          <button
            className="primary-button full-button"
            type="button"
            onClick={retry}
          >
            Retry
          </button>
        </>
      )}
    </section>
  );
}

export default function TunAuthPage() {
  return (
    <SiteFrame compact>
      <Suspense fallback={<div className="page-state">Connecting to Tun…</div>}>
        <TunAuthFlow />
      </Suspense>
    </SiteFrame>
  );
}
